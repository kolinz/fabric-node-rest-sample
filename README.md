# Hyperledger Fabric 2.5 LTS + Node.js 24 レンタカー貸出・返却 REST API 教材

## 1. この教材の目的

この教材は、Hyperledger Fabric 2.5 LTS 上に、レンタカーの貸出・返却を行うスマートコントラクトを実装し、Node.js 24 + Express による REST API から操作するための最小構成です。

単なる Asset Transfer ではなく、業務システム風のデータ項目と業務ルールを持たせています。

## 2. 採用技術

```text
Hyperledger Fabric: 2.5 LTS
Fabric Network: fabric-samples/test-network
Chaincode: Node.js 24 / JavaScript
Client/API: Node.js 24 / Express
Communication: Fabric Gateway SDK
Runtime: Docker / Docker Compose
```

## 3. 全体構成

```text
curl / Postman / Web Frontend
  ↓ HTTP
Express REST API
  ↓ Fabric Gateway SDK
Hyperledger Fabric test-network
  ↓
rental chaincode
```

## 4. ディレクトリ構成

```text
fabric-node-rest-sample/
├── README.md
└── fabric-rental-node24-rest/
    ├── scripts/
    ├── chaincode/
    └── app/
```

## 5. 前提ソフトウェア

- Docker
- Docker Compose
- Node.js 24
- Git
- curl

## 6. Fabric samples の準備

以下のような構成になっています。
```text
fabric-node-rest-sample/
└──fabric-rental-node24-rest/
```

任意の作業ディレクトリで以下を実行します。

```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
chmod +x install-fabric.sh
./install-fabric.sh --fabric-version 2.5.15 --ca-version 1.5.17 docker samples binary
```

以下のような構成になります。
```text
fabric-node-rest-sample/
├──fabric-samples/
└──fabric-rental-node24-rest/
```

## 7. Fabric ネットワーク起動とチェーンコードデプロイ

```bash
cd fabric-rental-node24-rest
./scripts/network-up.sh
```

## 8. API アプリのセットアップ

```bash
cd fabric-rental-node24-rest/chaincode/rental-js
npm install
```

```bash
cd ../../app
npm install
```

## 9. 初期データ登録

CLIから初期データを登録します。

```bash
npm run init
```

## 10. REST API サーバー起動

```bash
npm run api
```

標準では以下で起動します。

```text
http://localhost:3000
```

ポートを変える場合:

```bash
PORT=4000 npm run api
```

## 11. REST API 一覧

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/health` | APIの生存確認 |
| GET | `/api/cars` | 全車両一覧 |
| GET | `/api/cars/available` | 貸出可能車両一覧 |
| GET | `/api/cars/:carId` | 車両詳細 |
| GET | `/api/cars/:carId/history` | 車両履歴 |
| POST | `/api/cars` | 車両新規登録 |
| POST | `/api/cars/:carId/rent` | 車両貸出 |
| POST | `/api/cars/:carId/return` | 車両返却 |
| DELETE | `/api/cars/:carId` | 車両削除 |

## 12. API 操作例

### 12.1 生存確認

```bash
curl http://localhost:3000/health
```

### 12.2 全車両一覧

```bash
curl http://localhost:3000/api/cars
```

### 12.3 貸出可能車両一覧

```bash
curl http://localhost:3000/api/cars/available
```

### 12.4 車両詳細

```bash
curl http://localhost:3000/api/cars/CAR001
```

### 12.5 車両履歴

```bash
curl http://localhost:3000/api/cars/CAR001/history
```

### 12.6 車両新規登録

```bash
curl -X POST http://localhost:3000/api/cars \
  -H "Content-Type: application/json" \
  -d '{
    "carId": "CAR004",
    "plateNumber": "宇都宮300あ1234",
    "manufacturer": "Toyota",
    "model": "Yaris",
    "modelYear": 2024,
    "vehicleClass": "COMPACT",
    "mileage": 1000
  }'
```

### 12.7 車両貸出

```bash
curl -X POST http://localhost:3000/api/cars/CAR004/rent \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST001",
    "customerName": "山田太郎",
    "customerPhone": "090-0000-0000",
    "rentedAt": "2026-06-10T10:00:00+09:00",
    "expectedReturnAt": "2026-06-10T18:00:00+09:00"
  }'
```

### 12.8 車両返却

```bash
curl -X POST http://localhost:3000/api/cars/CAR004/return \
  -H "Content-Type: application/json" \
  -d '{
    "mileage": 1120,
    "returnedAt": "2026-06-10T17:30:00+09:00"
  }'
```

### 12.9 車両削除

```bash
curl -X DELETE http://localhost:3000/api/cars/CAR004
```

## 13. CLI 操作も利用可能

REST APIが本命ですが、動作確認用としてCLIも残しています。

```bash
npm run list
npm run available
npm run read -- CAR001
npm run create -- CAR004 "宇都宮300あ1234" Toyota Yaris 2024 COMPACT 1000
npm run rent -- CAR004 CUST001 "山田太郎" "090-0000-0000" "2026-06-10T10:00:00+09:00" "2026-06-10T18:00:00+09:00"
npm run return -- CAR004 1120 "2026-06-10T17:30:00+09:00"
npm run delete -- CAR004
```

## 14. 車両データモデル

```json
{
  "docType": "car",
  "carId": "CAR004",
  "plateNumber": "宇都宮300あ1234",
  "manufacturer": "Toyota",
  "model": "Yaris",
  "modelYear": 2024,
  "vehicleClass": "COMPACT",
  "status": "AVAILABLE",
  "currentRental": null,
  "lastRental": null,
  "mileage": 1000,
  "createdAt": "2026-06-10T00:00:00.000Z",
  "updatedAt": "2026-06-10T00:00:00.000Z"
}
```

## 15. 業務ルール

- 同じ `carId` の車両は登録できない
- 同じ `plateNumber` の車両は登録できない
- `modelYear` は 1900〜2100 の整数
- `mileage` は 0 以上の整数
- `vehicleClass` は `COMPACT`, `SEDAN`, `SUV`, `VAN`, `TRUCK`, `EV` のみ
- 貸出中の車両は二重貸出できない
- 返却時の走行距離は、貸出開始時の走行距離以上でなければならない
- 貸出中の車両は削除できない

## 16. Express API の役割

Express API は、HTTP リクエストを受け取り、Fabric Gateway SDK 経由でチェーンコードを呼び出します。

REST APIはブロックチェーンの外側にあります。業務ルールの最終チェックは、改ざんを防ぐためチェーンコード側に置いています。

## 17. 授業課題例

1. 車両クラスに `MINIVAN` を追加する
2. 顧客電話番号の形式チェックを追加する
3. 返却時に利用料金を計算する
4. 返却履歴を複数件保存できるようにする
5. Reactなどで簡単なフロントエンドを作成する
