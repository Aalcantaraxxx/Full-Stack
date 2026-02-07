const express = require('express');
const bodyParser = require('body-parser'); 
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'TEST'; 

// Middleware para parsear JSON
app.use(bodyParser.json());

// Archivos de persistencia
const TAREAS_FILE = 'tasks.json';
const USUARIOS_FILE = 'users.json';

// --- FUNCIONES AUXILIARES (Manejo de Archivos Asíncrono) ---
// Usamos async/await para no bloquear el Event Loop
const leerArchivo = async (archivo) => {
    try {
        const data = await fs.readFile(archivo, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const escribirArchivo = async (archivo, data) => {
    await fs.writeFile(archivo, JSON.stringify(data, null, 2));
};


// 1. Middleware de Autenticación (JWT)
const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso denegado: Token requerido' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
        req.user = user;
        next();
    });
};

// 2. Middleware de Validación de Datos (Ejemplo para crear tarea)
const validarTarea = (req, res, next) => {
    const { titulo, descripcion } = req.body;
    if (!titulo || !descripcion) {
        return res.status(400).json({ error: 'Faltan datos: Título y descripción son obligatorios' });
    }
    next();
};

// --- RUTAS DE AUTENTICACIÓN ---

// POST /register
app.post('/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).send('Usuario y contraseña requeridos');

        const usuarios = await leerArchivo(USUARIOS_FILE);
        
        // Verificar si existe
        if (usuarios.find(u => u.username === username)) {
            return res.status(400).send('El usuario ya existe');
        }

        // Hashing de contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const nuevoUsuario = { username, password: hashedPassword };
        usuarios.push(nuevoUsuario);
        
        await escribirArchivo(USUARIOS_FILE, usuarios);
        res.status(201).send('Usuario registrado exitosamente');
    } catch (error) {
        next(error);
    }
});

// POST /login
app.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const usuarios = await leerArchivo(USUARIOS_FILE);
        const user = usuarios.find(u => u.username === username);

        if (!user) return res.status(400).send('Usuario no encontrado');

        // Comparar contraseñas
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(403).send('Contraseña incorrecta');

        // Generar Token
        const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        next(error);
    }
});

// --- RUTAS CRUD ---

// GET /tareas
app.get('/tareas', autenticarToken, async (req, res, next) => {
    try {
        const tareas = await leerArchivo(TAREAS_FILE);
        res.json(tareas);
    } catch (error) {
        next(error);
    }
});

// POST /tareas
app.post('/tareas', autenticarToken, validarTarea, async (req, res, next) => {
    try {
        const tareas = await leerArchivo(TAREAS_FILE);
        const nuevaTarea = {
            id: Date.now(), // Generamos un ID simple basado en tiempo
            titulo: req.body.titulo,
            descripcion: req.body.descripcion,
            creadoPor: req.user.username
        };
        
        tareas.push(nuevaTarea);
        await escribirArchivo(TAREAS_FILE, tareas);
        res.status(201).json(nuevaTarea);
    } catch (error) {
        next(error);
    }
});

// PUT /tareas/:id
app.put('/tareas/:id', autenticarToken, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const tareas = await leerArchivo(TAREAS_FILE);
        const index = tareas.findIndex(t => t.id === id);

        if (index === -1) return res.status(404).send('Tarea no encontrada');

        // Actualizamos solo los campos enviados, manteniendo el ID y el creador
        tareas[index] = { ...tareas[index], ...req.body };
        
        await escribirArchivo(TAREAS_FILE, tareas);
        res.json(tareas[index]);
    } catch (error) {
        next(error);
    }
});

// DELETE /tareas/:id
app.delete('/tareas/:id', autenticarToken, async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        let tareas = await leerArchivo(TAREAS_FILE);
        
        const existe = tareas.find(t => t.id === id);
        if (!existe) return res.status(404).send('Tarea no encontrada');

        tareas = tareas.filter(t => t.id !== id);
        
        await escribirArchivo(TAREAS_FILE, tareas);
        res.status(200).send('Tarea eliminada');
    } catch (error) {
        next(error);
    }
});

// --- MANEJO DE ERRORES ---

// Middleware global de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Ocurrió un error interno en el servidor', 
        mensaje: err.message 
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});