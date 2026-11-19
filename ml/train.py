"""
Retrains the full 5-model ensemble (XGBoost, LightGBM, CatBoost, Random
Forest, GRU) for all 5 Delhi regions, on whatever's currently in data/.

Reconstructed from scratch — the original training scripts were lost
(only .pyc bytecode survived, never committed to git). Feature
engineering is untouched: it reuses ml/preprocess.py's
get_training_data(), which already produces the exact feature set each
saved *_features.pkl file expects, so this is a drop-in replacement for
ml/predict.py with no changes needed there.

Run as a module from the project root (so `ml.preprocess` resolves the
same way it does for predict.py):

    python3 -m ml.train

with the venv that has xgboost/lightgbm/catboost/scikit-learn/tensorflow
installed — the global/anaconda env here segfaults on `import tensorflow`.
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor
import tensorflow as tf
from tensorflow.keras import Sequential
from tensorflow.keras.layers import GRU, Dense, Dropout

from ml.preprocess import get_training_data

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(_BASE_DIR, "saved_models")

REGIONS = ["North_Delhi", "South_Delhi", "East_Delhi", "West_Delhi", "Central_Delhi"]
GRU_LOOKBACK = 24
TEST_FRAC = 0.15


def time_split(X, y, test_frac=TEST_FRAC):
    n_test = int(len(X) * test_frac)
    return X.iloc[:-n_test], X.iloc[-n_test:], y.iloc[:-n_test], y.iloc[-n_test:]


def eval_log_preds(y_true_log, y_pred_log):
    """Metrics are reported on the real PM2.5 scale, matching the old
    saved metrics.pkl files — the target itself is log1p(PM2.5)."""
    y_true = np.expm1(y_true_log)
    y_pred = np.expm1(np.asarray(y_pred_log).reshape(-1))
    y_pred = np.clip(y_pred, 0, None)
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
    }


def save_pkl(obj, path):
    with open(path, "wb") as f:
        pickle.dump(obj, f)


def make_gru_sequences(X, y, lookback=GRU_LOOKBACK):
    X_arr, y_arr = X.to_numpy(), y.to_numpy()
    seqs, targets = [], []
    for i in range(lookback, len(X_arr)):
        seqs.append(X_arr[i - lookback : i])
        targets.append(y_arr[i])
    return np.array(seqs), np.array(targets)


def train_region(region):
    print(f"\n=== {region} ===")
    X, y, feature_columns = get_training_data(region)
    print(f"  {len(X)} rows, {len(feature_columns)} features")
    X_train, X_test, y_train, y_test = time_split(X, y)

    # --- XGBoost ---
    xgb = XGBRegressor(
        n_estimators=600, max_depth=6, learning_rate=0.03,
        subsample=0.85, colsample_bytree=0.85, random_state=42,
    )
    xgb.fit(X_train, y_train)
    metrics = eval_log_preds(y_test, xgb.predict(X_test))
    print(f"  xgboost  mae={metrics['mae']:.2f} r2={metrics['r2']:.3f}")
    save_pkl(xgb, os.path.join(MODELS_DIR, f"{region}_xgboost.pkl"))
    save_pkl(feature_columns, os.path.join(MODELS_DIR, f"{region}_xgboost_features.pkl"))
    save_pkl(metrics, os.path.join(MODELS_DIR, f"{region}_xgboost_metrics.pkl"))

    # --- LightGBM ---
    lgbm = LGBMRegressor(
        n_estimators=600, max_depth=6, learning_rate=0.03,
        subsample=0.85, colsample_bytree=0.85, random_state=42, verbose=-1,
    )
    lgbm.fit(X_train, y_train)
    metrics = eval_log_preds(y_test, lgbm.predict(X_test))
    print(f"  lgbm     mae={metrics['mae']:.2f} r2={metrics['r2']:.3f}")
    save_pkl(lgbm, os.path.join(MODELS_DIR, f"{region}_lgbm.pkl"))
    save_pkl(feature_columns, os.path.join(MODELS_DIR, f"{region}_lgbm_features.pkl"))
    save_pkl(metrics, os.path.join(MODELS_DIR, f"{region}_lgbm_metrics.pkl"))

    # --- CatBoost ---
    cat = CatBoostRegressor(
        iterations=700, depth=6, learning_rate=0.03,
        random_seed=42, verbose=False,
    )
    cat.fit(X_train, y_train)
    metrics = eval_log_preds(y_test, cat.predict(X_test))
    print(f"  catboost mae={metrics['mae']:.2f} r2={metrics['r2']:.3f}")
    save_pkl(cat, os.path.join(MODELS_DIR, f"{region}_catboost.pkl"))
    save_pkl(feature_columns, os.path.join(MODELS_DIR, f"{region}_catboost_features.pkl"))
    save_pkl(metrics, os.path.join(MODELS_DIR, f"{region}_catboost_metrics.pkl"))

    # --- Random Forest ---
    # Capped well below a default-ish 400/14 config: that combination
    # pickled out to ~155MB for a single region on this dataset size,
    # which times 5 regions alone would blow most free-tier deploy
    # limits. min_samples_leaf raised too, since it's the main lever
    # that shrinks individual tree size, not just n_estimators.
    rf = RandomForestRegressor(
        n_estimators=150, max_depth=10, min_samples_leaf=8,
        random_state=42, n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    metrics = eval_log_preds(y_test, rf.predict(X_test))
    print(f"  rf       mae={metrics['mae']:.2f} r2={metrics['r2']:.3f}")
    save_pkl(rf, os.path.join(MODELS_DIR, f"{region}_rf.pkl"))
    save_pkl(feature_columns, os.path.join(MODELS_DIR, f"{region}_rf_features.pkl"))
    save_pkl(metrics, os.path.join(MODELS_DIR, f"{region}_rf_metrics.pkl"))

    # --- GRU (sequence model, scaled features, 24-step lookback) ---
    # RobustScaler (median/IQR), not StandardScaler: a handful of extreme
    # satellite readings (a bad AOD/NO2 pass) were blowing out the mean/std
    # on some regions, compressing all the normal-range values toward zero
    # and destabilizing training (R2 went negative on two regions). Trees
    # don't care about feature scale, so this only ever hit the GRU.
    # Gradient clipping + a lower LR for the same reason - keep bad batches
    # from throwing a wide elbow off a cliff mid-training.
    scaler = RobustScaler().fit(X_train)
    X_train_s = pd.DataFrame(
        np.clip(scaler.transform(X_train), -8, 8), columns=X_train.columns, index=X_train.index
    )
    X_test_s = pd.DataFrame(
        np.clip(scaler.transform(X_test), -8, 8), columns=X_test.columns, index=X_test.index
    )

    Xg_train, yg_train = make_gru_sequences(X_train_s, y_train)
    Xg_test, yg_test = make_gru_sequences(X_test_s, y_test)

    gru = Sequential([
        GRU(32, input_shape=(GRU_LOOKBACK, len(feature_columns)), return_sequences=False),
        Dropout(0.25),
        Dense(16, activation="relu"),
        Dense(1),
    ])
    gru.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=5e-4, clipnorm=1.0), loss="mse")
    gru.fit(
        Xg_train, yg_train,
        validation_split=0.1, epochs=60, batch_size=32,
        verbose=0,
        callbacks=[tf.keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True)],
    )
    metrics = eval_log_preds(yg_test, gru.predict(Xg_test, verbose=0))
    print(f"  gru      mae={metrics['mae']:.2f} r2={metrics['r2']:.3f}")
    gru.save(os.path.join(MODELS_DIR, f"{region}_gru.h5"))
    save_pkl(feature_columns, os.path.join(MODELS_DIR, f"{region}_gru_features.pkl"))
    save_pkl(scaler, os.path.join(MODELS_DIR, f"{region}_gru_scaler.pkl"))
    save_pkl(metrics, os.path.join(MODELS_DIR, f"{region}_gru_metrics.pkl"))


if __name__ == "__main__":
    for region in REGIONS:
        train_region(region)
    print("\nAll regions retrained.")
