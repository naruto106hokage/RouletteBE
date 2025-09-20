# 🎲 Roulette Game Backend

A robust Node.js backend server for a Roulette game application with authentication and balance management.

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

## 🚀 Features

- 📱 Phone number-based authentication
- 💰 Balance management system
- 🔐 JWT-based security
- 💳 Payment gateway integration
- 📊 Transaction history
- 🎮 Game integration support

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **Payment**: Indian Pay Gateway Integration

## 📋 API Endpoints

### Authentication
```http
POST /api/player/login
# Phone number authentication
```

### Balance Management
```http
GET /api/balance/profile
# Get user profile with balances

POST /api/balance/recharge
# Initiate balance recharge

POST /api/balance/spend
# Spend balance in game

GET /api/balance/recharge-history
# Get transaction history
```

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/naruto106hokage/RouletteBE.git
   cd RouletteBE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔧 Environment Variables

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
INDIANPAY_MERCHANT_ID=your_merchant_id
REDIRECT_URL=your_redirect_url
```

## 🔒 Security Features

- JWT-based authentication
- Password hashing
- Rate limiting
- Input validation
- Error handling

## 💰 Balance System

The system manages two types of balances:
- **Top-up Balance**: Added through recharge
- **Winning Balance**: Game winnings

### Transaction Types
- ✅ Recharge
- 💸 Deduction
- 🎮 Game Spend
- 🏆 Winning Credit

## 📝 API Documentation

### Balance Management

#### Get Profile
```http
GET /api/balance/profile
Authorization: Bearer <token>

Response:
{
    "meta": {
        "msg": "Profile fetched successfully",
        "status": true
    },
    "data": {
        "winningBalance": 0,
        "topUpBalance": 1000,
        "lastTransactionId": "TX123456"
    }
}
```

#### Recharge Balance
```http
POST /api/balance/recharge
Authorization: Bearer <token>
{
    "amount": 100,
    "transactionId": "TX123456"
}

Response:
{
    "status": "SUCCESS",
    "amount": "100",
    "order_id": "TX123456",
    "payment_link": "https://..."
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**naruto106hokage**

## 🙏 Acknowledgments

- Express.js community
- MongoDB team
- Node.js community

---
⭐️ If you found this project helpful, please give it a star!