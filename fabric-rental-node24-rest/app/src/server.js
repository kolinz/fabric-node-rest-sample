import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import carsRouter from './routes/cars.js';

const app = express();
const port = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/health', (_req, res) => res.json({ status:'ok', service:'fabric-rental-api', timestamp:new Date().toISOString() }));
app.use('/api/cars', carsRouter);
app.use((req,res)=>res.status(404).json({ error:{ message:`Route not found: ${req.method} ${req.originalUrl}` } }));
app.use((err,_req,res,_next)=>res.status(err.statusCode||500).json({ error:{ message:err.message||'Internal Server Error', details:err.details||undefined } }));
app.listen(port,()=>console.log(`Rental REST API listening on http://localhost:${port}`));
