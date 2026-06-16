import { Router } from 'express';
import { withContract } from '../connect.js';
const router = Router();

router.get('/', asyncHandler(async (_req,res)=>res.json(await evaluate('GetAllCars'))));

router.get('/available', asyncHandler(async (_req,res)=>res.json(await evaluate('GetAvailableCars'))));

router.get('/:carId/history', asyncHandler(async (req, res) => {
  const result = await evaluate('GetCarHistory', req.params.carId);
  res.json(result);
}));

router.get('/:carId', asyncHandler(async (req,res)=>res.json(await evaluate('ReadCar', req.params.carId))));

router.post('/', asyncHandler(async (req,res)=>{
  const {carId,plateNumber,manufacturer,model,modelYear,vehicleClass,mileage}=req.body;
  requireFields(req.body,['carId','plateNumber','manufacturer','model','modelYear','vehicleClass','mileage']);
  const result = await submit('CreateCar', String(carId), String(plateNumber), String(manufacturer), String(model), String(modelYear), String(vehicleClass), String(mileage));
  res.status(201).json(result);
}));

router.post('/:carId/rent', asyncHandler(async (req,res)=>{
  const {customerId,customerName,customerPhone,rentedAt,expectedReturnAt}=req.body;
  requireFields(req.body,['customerId','customerName','customerPhone','rentedAt','expectedReturnAt']);
  res.json(await submit('RentCar', String(req.params.carId), String(customerId), String(customerName), String(customerPhone), String(rentedAt), String(expectedReturnAt)));
}));

router.post('/:carId/return', asyncHandler(async (req,res)=>{
  const {mileage,returnedAt}=req.body;
  requireFields(req.body,['mileage','returnedAt']);
  res.json(await submit('ReturnCar', String(req.params.carId), String(mileage), String(returnedAt)));
}));

router.delete('/:carId', asyncHandler(async (req,res)=>res.json(await submit('DeleteCar', String(req.params.carId)))));

async function evaluate(name,...args){ return withContract(async (contract)=>parseFabricResult(await contract.evaluateTransaction(name,...args))); }
async function submit(name,...args){ return withContract(async (contract)=>parseFabricResult(await contract.submitTransaction(name,...args))); }
function parseFabricResult(resultBytes){ const text=Buffer.from(resultBytes).toString('utf8'); if(!text) return null; try{return JSON.parse(text);}catch{return {message:text};} }
function requireFields(body,fields){ const missing=fields.filter((f)=>body[f]===undefined||body[f]===null||body[f]===''); if(missing.length){ const e=new Error(`Missing required fields: ${missing.join(', ')}`); e.statusCode=400; throw e; } }
function asyncHandler(handler){ return async (req,res,next)=>{ try{ await handler(req,res,next); } catch(error){ next(normalizeError(error)); } }; }
function normalizeError(error){ const message=error.details?.[0]?.message || error.message || String(error); if(message.includes('does not exist')||message.includes('not found')) error.statusCode=404; else if(message.includes('already exists')||message.includes('not available')||message.includes('is not rented')||message.includes('must be')||message.includes('required')||message.includes('cannot be deleted')) error.statusCode=400; error.message=message; return error; }
export default router;
