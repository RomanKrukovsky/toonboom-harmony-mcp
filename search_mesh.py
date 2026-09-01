import json

with open("gramps_rig.json", "r") as f:
    data = json.load(f)

def find_layer(layers, name):
    for l in layers:
        if l.get("name") == name:
            return l
        if "layers" in l:
            res = find_layer(l["layers"], name)
            if res: return res
    return None

# Выведем структуру одного MeshLayer, если найдем
def get_mesh_layer(layers):
    for l in layers:
        if l.get("type") == "MeshLayer":
            return l
        if "layers" in l:
            res = get_mesh_layer(l["layers"])
            if res: return res
    return None

mesh = get_mesh_layer(data.get("layers", []))
if mesh:
    print(json.dumps(mesh, indent=2))
else:
    print("MeshLayer not found")
