from fastapi import FastAPI

app = FastAPI()
@app.get("/")
def read_root():
    pass

@app.post("/")
def ai():
    pass