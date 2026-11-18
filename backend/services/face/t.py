import torch
ckpt = torch.load("scan_weights/kit_weights.pt", map_location="cpu", weights_only=False)
print(ckpt.keys())
print(ckpt.get("args"))