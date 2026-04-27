import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from ml.predict import predict_next_day
res = predict_next_day("North_Delhi")
print("best_model:", res.get("best_model"))
