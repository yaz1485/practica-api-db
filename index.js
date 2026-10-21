require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const { Parser } = require('json2csv');

require('./database/db'); // Conexión a MongoDB Atlas

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configuración de Multer para la subida temporal de archivos
const upload = multer({ dest: 'uploads/' });

// Definición del Esquema y Modelo en Mongoose
const recursoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    genero: { type: String, required: true }
});

const Recurso = mongoose.model('Recurso', recursoSchema);

// --- ENDPOINTS ANTERIORES (CRUD Básico) ---
app.get('/', (req, res) => {
    res.send('API REST con Base de Datos MongoDB funcionando correctamente');
});

// Registrar un recurso (POST)
app.post('/api/recursos', async (req, res) => {
    try {
        const nuevoRecurso = new Recurso(req.body);
        const guardado = await nuevoRecurso.save();
        res.status(201).json(guardado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Obtener todos los recursos (GET)
app.get('/api/recursos', async (req, res) => {
    try {
        const recursos = await Recurso.find();
        res.json(recursos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==========================================
// NUEVOS ENDPOINTS: PRÁCTICA 4 (JSON / CSV)
// ==========================================

// 1. ENDPOINT DE IMPORTACIÓN (POST)
app.post('/api/recursos/importar', upload.single('archivo'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    try {
        if (originalName.endsWith('.json')) {
            // Lógica para procesar archivo JSON
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);

            await Recurso.insertMany(jsonData);
            fs.unlinkSync(filePath); // Limpiar archivo temporal

            return res.status(200).json({
                mensaje: 'Archivo JSON importado correctamente',
                registrosInsertados: jsonData.length
            });

        } else if (originalName.endsWith('.csv')) {
            // Lógica para procesar archivo CSV
            const resultados = [];

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    resultados.push(row);
                })
                .on('end', async () => {
                    await Recurso.insertMany(resultados);
                    fs.unlinkSync(filePath); // Limpiar archivo temporal

                    return res.status(200).json({
                        mensaje: 'Archivo CSV importado correctamente',
                        registrosInsertados: resultados.length
                    });
                });
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Formato de archivo no soportado. Usa .json o .csv' });
        }
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: error.message });
    }
});

// 2. ENDPOINT DE EXPORTACIÓN (GET)
app.get('/api/recursos/exportar/:formato', async (req, res) => {
    const formato = req.params.formato;

    try {
        const recursos = await Recurso.find();

        if (formato === 'json') {
            res.setHeader('Content-Disposition', 'attachment; filename=datos_exportados.json');
            res.setHeader('Content-Type', 'application/json');
            return res.json(recursos);

        } else if (formato === 'csv') {
            const fields = ['_id', 'nombre', 'genero'];
            const json2csvParser = new Parser({ fields });
            const csvData = json2csvParser.parse(recursos);

            res.setHeader('Content-Disposition', 'attachment; filename=datos_exportados.csv');
            res.setHeader('Content-Type', 'text/csv');
            return res.send(csvData);

        } else {
            return res.status(400).json({ error: 'Formato de exportación inválido. Usa json o csv' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});