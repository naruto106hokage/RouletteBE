const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

// Helper function to update user balance
async function updateUserBalance(userId) {
    try {
        console.log('Starting balance update for user:', userId);
        
        // Get all completed transactions
        const transactions = await Transaction.find({
            userId: userId,
            status: 'completed'
        }).sort({ createdAt: 1 }); // Sort by oldest first

        console.log('Found transactions:', transactions.length);

        // Calculate total balance
        let totalBalance = {
            topUpBalance: 0,
            winningBalance: 0
        };

        for (const transaction of transactions) {
            console.log('Processing transaction:', {
                type: transaction.type,
                amount: transaction.amount,
                id: transaction.transactionId
            });

            if (transaction.type === 'recharge') {
                totalBalance.topUpBalance += parseFloat(transaction.amount);
                console.log('After recharge:', totalBalance);
            } else if (transaction.type === 'deduction') {
                // For deductions, always subtract from topUpBalance first
                const deductionAmount = parseFloat(transaction.amount);
                totalBalance.topUpBalance -= deductionAmount;
                console.log('After deduction:', totalBalance);
            }
        }

        // Ensure no negative balances
        totalBalance.topUpBalance = Math.max(0, totalBalance.topUpBalance);
        totalBalance.winningBalance = Math.max(0, totalBalance.winningBalance);

        // Update user with the recalculated balance
        const user = await User.findById(userId);
        user.topUpBalance = totalBalance.topUpBalance;
        user.winningBalance = totalBalance.winningBalance;
        await user.save();

        console.log('Final Balance Update:', {
            userId,
            previousBalance: user.topUpBalance,
            newBalance: totalBalance,
            transactionCount: transactions.length
        });

        return totalBalance;
    } catch (error) {
        console.error('Update Balance Error:', error);
        throw error;
    }
};

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        console.log('Auth Header:', authHeader); // Debug log

        if (!authHeader) {
            return res.status(401).json({ error: 'No Authorization header found' });
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Invalid Authorization format. Must start with "Bearer "' });
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('Extracted Token:', token); // Debug log

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded Token:', decoded); // Debug log

            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            console.error('JWT Verification Error:', jwtError); // Debug log
            return res.status(401).json({ 
                error: 'Invalid token',
                details: jwtError.message 
            });
        }
    } catch (error) {
        console.error('General Error:', error); // Debug log
        res.status(401).json({ 
            error: 'Authentication failed',
            details: error.message 
        });
    }
};

// Get user profile with balances
router.get('/profile', verifyToken, async (req, res) => {
    try {
        // Update and get fresh balance
        const currentBalance = await updateUserBalance(req.user._id);
        const user = await User.findById(req.user._id);
        
        console.log('Profile - Updated User Data:', {
            id: user._id,
            topUpBalance: currentBalance.topUpBalance,
            winningBalance: currentBalance.winningBalance
        });

        // Get latest transaction for verification
        const latestTransaction = await Transaction.findOne({
            userId: user._id,
            status: 'completed'
        }).sort({ createdAt: -1 });
        
        console.log('Profile - Latest Transaction:', latestTransaction);

        // Ensure balances are numbers
        const topUpBalance = parseFloat(user.topUpBalance || 0);
        const winningBalance = parseFloat(user.winningBalance || 0);

        res.json({
            meta: {
                msg: "Profile fetched successfully",
                status: true
            },
            data: {
                winningBalance: winningBalance,
                topUpBalance: topUpBalance,
                lastTransactionId: latestTransaction?.transactionId
            }
        });
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({
            meta: {
                msg: "Error fetching profile",
                status: false
            }
        });
    }
});

// Initiate recharge
router.post('/recharge', verifyToken, async (req, res) => {
    try {
        const { amount, transactionId } = req.body;
        
        console.log('Starting recharge process');
        
        // Get current balance
        const currentBalance = await updateUserBalance(req.user._id);
        console.log('Current balance after update:', currentBalance);

        // Parse the amount
        const parsedAmount = parseFloat(amount);
        console.log('Recharge Amount:', parsedAmount);

        // Calculate new balance
        const newBalances = {
            topUpBalance: currentBalance.topUpBalance + parsedAmount,
            winningBalance: currentBalance.winningBalance
        };
        console.log('New Calculated Balance:', newBalances);

        // Create new transaction
        const transaction = new Transaction({
            userId: req.user._id,
            amount: parsedAmount,
            transactionId,
            type: 'recharge',
            status: 'completed',
            balanceAfterTransaction: newBalances
        });
        await transaction.save();
        console.log('Transaction saved:', transaction);

        // Update user's balance
        const user = req.user;
        user.topUpBalance = newBalances.topUpBalance;
        user.winningBalance = newBalances.winningBalance;
        await user.save();
        console.log('Updated User Balance:', {
            topUpBalance: user.topUpBalance,
            winningBalance: user.winningBalance
        });

        // Integration with Indian Pay gateway
        const paymentData = {
            merchantid: process.env.INDIANPAY_MERCHANT_ID || "INDIANPAY10053",
            orderid: transactionId,
            amount: amount.toString(),
            name: req.user.name,
            email: req.user.email || "",
            mobile: req.user.phoneNumber,
            remark: "Game recharge",
            type: "2",
            redirect_url: process.env.REDIRECT_URL || "https://ludo.ludosixer.com/"
        };

        // Here you would typically make a request to the payment gateway
        // For now, we'll simulate the response
        const paymentLink = `https://indianpay.co.in/admin/paynow?orderId=${transactionId}`;

        res.json({
            status: "SUCCESS",
            amount: amount.toString(),
            order_id: transactionId,
            payment_link: paymentLink,
            gateway_txn: transactionId
        });

    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
});

// Get recharge history
router.get('/recharge-history', verifyToken, async (req, res) => {
    try {
        const transactions = await Transaction.find({
            userId: req.user._id,
            type: 'recharge'
        })
        .sort({ createdAt: -1 })
        .limit(50); // Limit to last 50 transactions

        const formattedTransactions = transactions.map(t => ({
            amount: t.amount.toString(),
            transactionId: t.transactionId,
            createdAt: t.createdAt.getTime(),
            status: t.status,
            balanceAfterTransaction: t.balanceAfterTransaction || {
                topUpBalance: 0,
                winningBalance: 0
            }
        }));

        res.json({
            meta: {
                msg: "Transactions fetched successfully",
                status: true
            },
            data: formattedTransactions
        });
    } catch (error) {
        console.error('Transaction History Error:', error);
        res.status(500).json({
            meta: {
                msg: "Error fetching transactions",
                status: false
            }
        });
    }
});

// Spend money API
router.post('/spend', verifyToken, async (req, res) => {
    try {
        const { amount, type, gameId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                meta: {
                    msg: "Invalid amount",
                    status: false
                }
            });
        }

        const user = await User.findById(req.user._id);
        const parsedAmount = parseFloat(amount);

        // Determine which balance to use
        let balanceType = type || 'topup'; // Default to topup balance
        let currentBalance = balanceType === 'winning' ? user.winningBalance : user.topUpBalance;

        // Check if user has sufficient balance
        if (currentBalance < parsedAmount) {
            return res.status(400).json({
                meta: {
                    msg: "Insufficient balance",
                    status: false
                },
                data: {
                    currentBalance: currentBalance,
                    requiredAmount: parsedAmount
                }
            });
        }

        // Create transaction ID
        const transactionId = `SP${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Get latest transaction for balance tracking
        const latestTransaction = await Transaction.findOne({
            userId: user._id,
            status: 'completed'
        }).sort({ createdAt: -1 });

        const currentBalances = latestTransaction?.balanceAfterTransaction || {
            topUpBalance: user.topUpBalance,
            winningBalance: user.winningBalance
        };

        // Calculate new balances
        const newBalances = {
            topUpBalance: balanceType === 'winning' ? 
                currentBalances.topUpBalance : 
                currentBalances.topUpBalance - parsedAmount,
            winningBalance: balanceType === 'winning' ? 
                currentBalances.winningBalance - parsedAmount : 
                currentBalances.winningBalance
        };

        // Create spend transaction
        const transaction = new Transaction({
            userId: user._id,
            amount: parsedAmount,
            transactionId,
            type: 'deduction',
            status: 'completed',
            balanceAfterTransaction: newBalances,
            metadata: {
                gameId,
                spendType: balanceType
            }
        });
        await transaction.save();

        // Update user balance
        if (balanceType === 'winning') {
            user.winningBalance -= parsedAmount;
        } else {
            user.topUpBalance -= parsedAmount;
        }
        await user.save();

        res.json({
            meta: {
                msg: "Amount spent successfully",
                status: true
            },
            data: {
                transactionId,
                amount: parsedAmount,
                balanceAfterTransaction: newBalances,
                timestamp: new Date().getTime()
            }
        });

    } catch (error) {
        console.error('Spend Error:', error);
        res.status(500).json({
            meta: {
                msg: "Error processing spend request",
                status: false
            }
        });
    }
});

// Reset balance (for maintenance)
router.post('/reset-balance', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Reset balances
        user.topUpBalance = 0;
        user.winningBalance = 0;
        await user.save();

        // Mark all transactions as archived
        await Transaction.updateMany(
            { userId: req.user._id },
            { $set: { status: 'archived' } }
        );

        res.json({
            meta: {
                msg: "Balance reset successfully",
                status: true
            },
            data: {
                topUpBalance: 0,
                winningBalance: 0
            }
        });
    } catch (error) {
        console.error('Reset Balance Error:', error);
        res.status(500).json({
            meta: {
                msg: "Error resetting balance",
                status: false
            }
        });
    }
});

// Webhook for payment gateway callback
router.post('/payment-callback', async (req, res) => {
    try {
        const { orderId, status, amount } = req.body;

        const transaction = await Transaction.findOne({ transactionId: orderId });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (status === 'SUCCESS') {
            // Get latest balances
            const latestTransaction = await Transaction.findOne(
                { 
                    userId: transaction.userId,
                    status: 'completed'
                })
                .sort({ createdAt: -1 });

            const currentBalances = latestTransaction?.balanceAfterTransaction || {
                topUpBalance: 0,
                winningBalance: 0
            };

            // Calculate new balances
            const newBalances = {
                topUpBalance: currentBalances.topUpBalance + parseFloat(amount),
                winningBalance: currentBalances.winningBalance
            };

            // Update transaction
            transaction.status = 'completed';
            transaction.balanceAfterTransaction = newBalances;
            await transaction.save();

            // Update user record
            const user = await User.findById(transaction.userId);
            user.topUpBalance = newBalances.topUpBalance;
            user.winningBalance = newBalances.winningBalance;
            await user.save();
        } else {
            transaction.status = 'failed';
            await transaction.save();
        }

        res.json({ status: 'OK' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;