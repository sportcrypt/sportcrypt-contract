let testlib = require('../lib/testlib.js');

testlib.doTests([
{
  desc: "fuzz",
  actions: [
    { action: 'deposit', from: 'A', amount: 100000, },
    { action: 'deposit', from: 'B', amount: 100000, },
    { action: 'deposit', from: 'C', amount: 100000, },

    { action: 'order', from: 'A', amount: 100000, dir: process.env.DIR1, price: parseInt(process.env.PRICE1), orderId: 1, },
    { action: 'trade', from: 'B', orderId: 1, amount: parseInt(process.env.AMOUNT1), },

    { action: 'order', from: 'B', amount: 100000, dir: process.env.DIR2, price: parseInt(process.env.PRICE2), orderId: 2, },
    { action: 'trade', from: 'C', orderId: 2, amount: parseInt(process.env.AMOUNT2), },

    { action: 'order', from: 'C', amount: 100000, dir: process.env.DIR3, price: parseInt(process.env.PRICE3), orderId: 3, },
    { action: 'trade', from: 'A', orderId: 3, amount: parseInt(process.env.AMOUNT3), },
  ],
},
]);
