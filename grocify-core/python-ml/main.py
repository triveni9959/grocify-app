from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Grocify Intelligence Engine")

class PurchaseEvent(BaseModel):
    customer_id: str
    store_id: str
    items: list

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Grocify ML Engine Online", "nodes": 84}

def process_demand_signal(event: PurchaseEvent):
    # Mocking Pandas data processing for demand forecasting
    print(f"🧠 [STOCKSENSE] Processing purchase event for store {event.store_id}...")
    df = pd.DataFrame(event.items)
    
    # 1. Update velocity metrics
    # 2. Check stockout risk
    # 3. Fire recommendation if par levels hit
    print("✅ [STOCKSENSE] Analyzed basket rhythms and tuned local par levels.")

@app.post("/api/ml/ingest")
def ingest_purchase(event: PurchaseEvent, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_demand_signal, event)
    return {"status": "Processing", "queue": "BullMQ-Redis-Simulation"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
