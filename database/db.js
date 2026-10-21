const mongoose = require('mongoose');

const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Conectado exitosamente a la base de datos de MongoDB");
    } catch (error) {
        console.error("Error de conexión a la base de datos:", error.message);
        process.exit(1);
    }
};

conectarDB();