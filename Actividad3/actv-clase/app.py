from flask import Flask, request, jsonify

app = Flask(__name__)

users = []
tareas = []  

@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    user = {
        "id": len(users) + 1,
        "name": data["name"],
        "email": data["email"],
        "password": data["password"] 
    }
    users.append(user)
    return jsonify({
        "message": "Usuario creado correctamente",
        "user": user
    }), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = next((u for u in users if u["email"] == data["email"] and u["password"] == data["password"]), None)
    
    if user:
        return jsonify({"message": "Login exitoso", "token": "123456789"}), 200
    return jsonify({"message": "Credenciales inválidas"}), 401


# --- ENDPOINTS DE TAREAS---

# 1. GET /tareas (Obtener todas)
@app.route('/tareas', methods=['GET'])
def get_tareas():
    return jsonify(tareas), 200

# 2. POST /tareas (Crear tarea)
@app.route('/tareas', methods=['POST'])
def create_tarea():
    data = request.get_json()
    tarea = {
        "id": len(tareas) + 1,
        "titulo": data["titulo"],
        "descripcion": data["descripcion"],
        "completada": False
    }
    tareas.append(tarea)
    return jsonify({
        "message": "Tarea creada correctamente",
        "tarea": tarea
    }), 201

# 3. PUT /tareas/<id> (Actualizar tarea)
@app.route('/tareas/<int:id>', methods=['PUT'])
def update_tarea(id):
    data = request.get_json()
    tarea = next((t for t in tareas if t["id"] == id), None)

    if not tarea:
        return jsonify({"message": "Tarea no encontrada"}), 404

    tarea["titulo"] = data.get("titulo", tarea["titulo"])
    tarea["descripcion"] = data.get("descripcion", tarea["descripcion"])
    tarea["completada"] = data.get("completada", tarea["completada"])

    return jsonify({
        "message": "Tarea actualizada",
        "tarea": tarea
    }), 200

# 4. DELETE /tareas/<id> (Eliminar tarea)
@app.route('/tareas/<int:id>', methods=['DELETE'])
def delete_tarea(id):
    global tareas
    tareas = [t for t in tareas if t["id"] != id]
    
    return jsonify({"message": "Tarea eliminada"}), 200


if __name__ == '__main__':
    app.run(debug=True)