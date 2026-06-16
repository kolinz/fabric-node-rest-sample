'use strict';

const { Contract } = require('fabric-contract-api');

const STATUS_AVAILABLE = 'AVAILABLE';
const STATUS_RENTED = 'RENTED';

const VEHICLE_CLASSES = new Set([
  'COMPACT',
  'SEDAN',
  'SUV',
  'VAN',
  'TRUCK',
  'EV',
]);

class RentalContract extends Contract {
  async InitLedger(ctx) {
    const now = this._getTxTime(ctx);

    const cars = [
      this._newCar({
        carId: 'CAR001',
        plateNumber: 'UTSUNOMIYA-300-A-1001',
        manufacturer: 'Toyota',
        model: 'Aqua',
        modelYear: 2023,
        vehicleClass: 'COMPACT',
        mileage: 12000,
        now,
      }),
      this._newCar({
        carId: 'CAR002',
        plateNumber: 'UTSUNOMIYA-300-A-1002',
        manufacturer: 'Honda',
        model: 'Fit',
        modelYear: 2022,
        vehicleClass: 'COMPACT',
        mileage: 8300,
        now,
      }),
      this._newCar({
        carId: 'CAR003',
        plateNumber: 'UTSUNOMIYA-300-A-1003',
        manufacturer: 'Nissan',
        model: 'Note',
        modelYear: 2024,
        vehicleClass: 'EV',
        mileage: 15100,
        now,
      }),
    ];

    for (const car of cars) {
      await ctx.stub.putState(car.carId, Buffer.from(JSON.stringify(car), 'utf8'));
    }

    return JSON.stringify(cars);
  }

  async CreateCar(ctx, carId, plateNumber, manufacturer, model, modelYearText, vehicleClass, mileageText) {
    this._requireText(carId, 'carId');
    this._requireText(plateNumber, 'plateNumber');
    this._requireText(manufacturer, 'manufacturer');
    this._requireText(model, 'model');
    this._validateVehicleClass(vehicleClass);

    const exists = await this.CarExists(ctx, carId);
    if (exists) {
      throw new Error(`Car ${carId} already exists`);
    }

    const duplicatePlateNumber = await this._findCarByPlateNumber(ctx, plateNumber);
    if (duplicatePlateNumber) {
      throw new Error(`Plate number ${plateNumber} already exists`);
    }

    const modelYear = this._parseModelYear(modelYearText);
    const mileage = this._parseMileage(mileageText);
    const now = this._getTxTime(ctx);

    const car = this._newCar({
      carId,
      plateNumber,
      manufacturer,
      model,
      modelYear,
      vehicleClass,
      mileage,
      now,
    });

    await ctx.stub.putState(carId, Buffer.from(JSON.stringify(car), 'utf8'));
    return JSON.stringify(car);
  }

  async ReadCar(ctx, carId) {
    this._requireText(carId, 'carId');

    const carBytes = await ctx.stub.getState(carId);
    if (!carBytes || carBytes.length === 0) {
      throw new Error(`Car ${carId} does not exist`);
    }

    return carBytes.toString('utf8');
  }

  async CarExists(ctx, carId) {
    const carBytes = await ctx.stub.getState(carId);
    return !!carBytes && carBytes.length > 0;
  }

  async GetAllCars(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const results = [];

    try {
      while (true) {
        const response = await iterator.next();

        if (response.value && response.value.value) {
          const value = response.value.value.toString('utf8');
          if (value) {
            const record = JSON.parse(value);
            if (record.docType === 'car') {
              results.push(record);
            }
          }
        }

        if (response.done) {
          break;
        }
      }
    } finally {
      await iterator.close();
    }

    return JSON.stringify(results);
  }

  async GetAvailableCars(ctx) {
    const cars = JSON.parse(await this.GetAllCars(ctx));
    return JSON.stringify(cars.filter((car) => car.status === STATUS_AVAILABLE));
  }

  async GetCarHistory(ctx, carId) {
    this._requireText(carId, 'carId');

    const iterator = await ctx.stub.getHistoryForKey(carId);
    const results = [];

    try {
      while (true) {
        const response = await iterator.next();

        if (response.value) {
          const item = {
            txId: response.value.txId,
            isDelete: response.value.isDelete,
            timestamp: response.value.timestamp,
            value: null,
          };

          if (response.value.value && response.value.value.length > 0) {
            item.value = JSON.parse(response.value.value.toString('utf8'));
          }

          results.push(item);
        }

        if (response.done) {
          break;
        }
      }
    } finally {
      await iterator.close();
    }

    return JSON.stringify(results);
  }

  async RentCar(ctx, carId, customerId, customerName, customerPhone, rentedAt, expectedReturnAt) {
    this._requireText(carId, 'carId');
    this._requireText(customerId, 'customerId');
    this._requireText(customerName, 'customerName');
    this._requireText(customerPhone, 'customerPhone');
    this._requireText(rentedAt, 'rentedAt');
    this._requireText(expectedReturnAt, 'expectedReturnAt');

    const car = JSON.parse(await this.ReadCar(ctx, carId));

    if (car.status !== STATUS_AVAILABLE) {
      throw new Error(`Car ${carId} is not available`);
    }

    const txId = ctx.stub.getTxID();
    const now = this._getTxTime(ctx);

    car.status = STATUS_RENTED;
    car.currentRental = {
      rentalId: `RENTAL-${carId}-${txId}`,
      customerId,
      customerName,
      customerPhone,
      rentedAt,
      expectedReturnAt,
      startMileage: car.mileage,
    };
    car.updatedAt = now;

    await ctx.stub.putState(carId, Buffer.from(JSON.stringify(car), 'utf8'));
    return JSON.stringify(car);
  }

  async ReturnCar(ctx, carId, mileageText, returnedAt) {
    this._requireText(carId, 'carId');
    this._requireText(returnedAt, 'returnedAt');

    const returnMileage = this._parseMileage(mileageText);
    const car = JSON.parse(await this.ReadCar(ctx, carId));

    if (car.status !== STATUS_RENTED) {
      throw new Error(`Car ${carId} is not rented`);
    }

    if (returnMileage < car.currentRental.startMileage) {
      throw new Error('Return mileage must be greater than or equal to start mileage');
    }

    const now = this._getTxTime(ctx);
    const distance = returnMileage - car.currentRental.startMileage;

    car.lastRental = {
      ...car.currentRental,
      returnedAt,
      returnMileage,
      distance,
    };
    car.currentRental = null;
    car.status = STATUS_AVAILABLE;
    car.mileage = returnMileage;
    car.updatedAt = now;

    await ctx.stub.putState(carId, Buffer.from(JSON.stringify(car), 'utf8'));
    return JSON.stringify(car);
  }

  async DeleteCar(ctx, carId) {
    const car = JSON.parse(await this.ReadCar(ctx, carId));
    if (car.status === STATUS_RENTED) {
      throw new Error(`Car ${carId} is currently rented and cannot be deleted`);
    }

    await ctx.stub.deleteState(carId);
    return JSON.stringify({ message: `Car ${carId} deleted` });
  }

  _getTxTime(ctx) {
    const timestamp = ctx.stub.getTxTimestamp();
    const seconds = Number(timestamp.seconds);
    const nanos = Number(timestamp.nanos || 0);
    const millis = seconds * 1000 + Math.floor(nanos / 1000000);

    return new Date(millis).toISOString();
  }
  
  _newCar({ carId, plateNumber, manufacturer, model, modelYear, vehicleClass, mileage, now }) {
    return {
      docType: 'car',
      carId,
      plateNumber,
      manufacturer,
      model,
      modelYear,
      vehicleClass,
      status: STATUS_AVAILABLE,
      currentRental: null,
      lastRental: null,
      mileage,
      createdAt: now,
      updatedAt: now,
    };
  }

  async _findCarByPlateNumber(ctx, plateNumber) {
    const cars = JSON.parse(await this.GetAllCars(ctx));
    return cars.find((car) => car.plateNumber === plateNumber) || null;
  }

  _requireText(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${name} is required`);
    }
  }

  _validateVehicleClass(value) {
    this._requireText(value, 'vehicleClass');
    if (!VEHICLE_CLASSES.has(value)) {
      throw new Error(`vehicleClass must be one of: ${Array.from(VEHICLE_CLASSES).join(', ')}`);
    }
  }

  _parseModelYear(value) {
    const modelYear = Number(value);
    if (!Number.isInteger(modelYear) || modelYear < 1900 || modelYear > 2100) {
      throw new Error('modelYear must be an integer between 1900 and 2100');
    }
    return modelYear;
  }

  _parseMileage(value) {
    const mileage = Number(value);
    if (!Number.isInteger(mileage) || mileage < 0) {
      throw new Error('mileage must be a non-negative integer');
    }
    return mileage;
  }
}

module.exports = RentalContract;