import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = `mongodb+srv://${process.env.DB_USERNAME}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_CLUSTER_URL}/?retryWrites=true&w=majority&appName=Cluster0`;


const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

const connectToDatabase = async () => {
    try {
        await mongoose.connect(connectionString, connectionParams);
        console.log('Connected to database');
    } catch (err) {
        console.error(`Error connecting to the database.\n${err}`);
    }
};

// Export both values
export { connectionString, connectToDatabase };