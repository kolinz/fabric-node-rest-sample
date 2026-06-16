import * as grpc from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import path from 'path';

const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'rental';
const mspId = process.env.MSP_ID || 'Org1MSP';
const fabricSamplesPath = process.env.FABRIC_SAMPLES_PATH || path.resolve(process.cwd(), '../../fabric-samples');
const peerEndpoint = process.env.PEER_ENDPOINT || 'localhost:7051';
const peerHostAlias = process.env.PEER_HOST_ALIAS || 'peer0.org1.example.com';
const cryptoPath = path.resolve(fabricSamplesPath,'test-network','organizations','peerOrganizations','org1.example.com');
const certDirectoryPath = path.resolve(cryptoPath,'users','User1@org1.example.com','msp','signcerts');
const keyDirectoryPath = path.resolve(cryptoPath,'users','User1@org1.example.com','msp','keystore');
const tlsCertPath = path.resolve(cryptoPath,'peers','peer0.org1.example.com','tls','ca.crt');

export async function withContract(handler) {
  const { contract, close } = await newContract();
  try { return await handler(contract); } finally { close(); }
}

export async function newContract() {
  const client = await newGrpcConnection();
  const gateway = connect({
    client,
    identity: await newIdentity(),
    signer: await newSigner(),
    hash: hash.sha256,
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    submitOptions: () => ({ deadline: Date.now() + 5000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
  });
  const network = gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);
  return { contract, close: () => { gateway.close(); client.close(); } };
}
async function newGrpcConnection() {
  const tlsRootCert = await fs.readFile(tlsCertPath);
  return new grpc.Client(peerEndpoint, grpc.credentials.createSsl(tlsRootCert), {'grpc.ssl_target_name_override': peerHostAlias});
}
async function newIdentity() {
  const certPath = await getFirstFilePath(certDirectoryPath);
  return { mspId, credentials: await fs.readFile(certPath) };
}
async function newSigner() {
  const keyPath = await getFirstFilePath(keyDirectoryPath);
  const privateKey = crypto.createPrivateKey(await fs.readFile(keyPath));
  return signers.newPrivateKeySigner(privateKey);
}
async function getFirstFilePath(directoryPath) {
  const files = await fs.readdir(directoryPath);
  if (files.length === 0) throw new Error(`No files found in ${directoryPath}`);
  return path.join(directoryPath, files[0]);
}
