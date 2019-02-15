# SportCrypt Orderbook Protocol

## URL

For mainnet, a websocket connection is made to the following URL:

    wss://sportcrypt.com/ws-mainnet/

## Framing

Every message, in each direction, consists of 2 JSON items, separated by a newline. The first JSON is the header and the second is the body.

Messages from the client must include `op` and `id` parameters in the header. `op` refers to the operation requested and `id` is a sequence identifier specific to that request.

Responses from the server will return the `id` parameter in their header only if the message is a response to a request.

For example, to add an order to the orderbook a client would send the following:

    {"op":"add-order","id":3}
    {"order":"45744a14..."}

And then the server would respond as follows:

    {"id":3}
    {"status":"ok"}

The purpose of the 2 separate JSON parts is so that routing can be performed by examining the header without necessarily needing to parse the body.

Since the protocol is asynchronous, `id` is used by the client to match up responses with their corresponding requests.

## Client Ops

These are commands sent by the client to the server.

### subs

This is the first operation that a client should send after connecting. It manages the subscriptions for the connection, that is what data the client is interested in receiving.

Request:

    {"op":"subs","id":1}
    {"bulletin":0,"match":0,"chatmsg":0,"all-orders":true,"txstream":0,"vol":0,"tx-address":"0x6f794648e66e4bb155977e07447ea60f864cf816","client":"mycode-2.3.6"}

Since websockets can be disconnected frequently, and also because clients may choose to persist some of this data across sessions, "resume" numbers can be provided to elide some of the response, saving bandwidth and processing. A resume number of 0 means "I have no data, please send me everything".

The following items in the body correspond to resume numbers:

* `bulletin`
* `match`
* `chatmsg` (only sends recent entries) 
* `txstream` (only sends recent entries)
* `tx`
* `orders` (dictionary of order resume numbers keyed by match id)
* `mthist` (dictionary of mthist resume numbers keyed by match id)
* `vol`
* `hist` (DEPRECATED -- see below)

The following items have special meanings:

* `all-orders` - Client wants to subscribe for orders made on all matches. Needed for full orderbook display
* `tx-address` - Client wants to be notified of new confirmed transactions for this ethereum address (usually the user's metamask address)
* `client` - The client should include its software name and version in this field.

### add-order

Adds an order to the orderbook. The order is packed as described in the whitepaper section 4.3, and encoded as a hex string.

Request:

    {"op":"add-order","id":3}
    {"order":"45744a14..."}

Response:

    {"id":3}
    {"status":"ok"}

### ping

An empty request and response, matched by `id`. Used to keep the websocket connection active since TCP-level SO_KEEPALIVE won't make it through cloudflare proxy.

Request:

    {"op":"ping","id":28}
    {}

Response:

    {"id":28}
    {}

### match-info

Used for getting info on a specific match, even if not in the subscription stream (ie older matches that have been cycled off).

Request:

    {"op":"match-info","id":1}
    {"matchId":"fd3f0a25365842bbbe21472aa7f3c69326c275923564bce6e3f19d7f28ce320c"}

Reponse:

    {"id":1}
    [{"match":{"details":{"cancelPrice":"50","contractAddr":"45744a141563f13e1053b665a13d7b0b794dcf1a","event":{"kickoff":"1519671600","league":"Segunda Division","region":"Spain","spread":"+0.5","team1":"Tenerife","team2":"Lugo"},"nonce":"5IxOtGwjTIZfPM1bst288R","recoveryWeeks":"12","type":"sports/soccer/game"},"id":"fd3f0a25365842bbbe21472aa7f3c69326c275923564bce6e3f19d7f28ce320c","linkid":"5fac9c41eb0d346752793b09224d69159b829e97cf6a538b7a2473090986e7d2"},"op":"match-new"}]

NOTE: See below for information on the match format.

### tx-info

Used to implement betslips. Gets details on a specific transaction, given its transaction id (ethereum tx hash). Output format is the same as with `txstream` and `tx`.

Request:

    {"op":"tx-info","id":1}
    {"txId":"0x8e4dffcb94aae324f597730e09255aee629359f54543b703c3866b5f4d7a84d2"}

Response:

    {"id":1}
    [{"op":"tx-new","tx":{"block":9,"hash":"0x8e4dffcb94aae324f597730e09255aee629359f54543b703c3866b5f4d7a84d2","longAmount":"42592592592592592","makerAccount":"0x6f794648e66e4bb155977e07447ea60f864cf816","makerBalanceNewAmount":"8879629629629629630","makerBalanceOldAmount":"8829629629629629630","matchId":"0x5f67f9400bd5749212745f6487462b55fc218cb2dea324da63c81b662a2f320c","newLongPosition":"-277777777777777777","newShortPosition":"277777777777777777","orderDirection":"1","orderHash":"0xe8da84f1129216c568d48cf0085eef1f224e245555df3d7b8e979c84878b87a3","price":"46","shortAmount":"50000000000000000","takerAccount":"0x5809b0d509476ce7c95e2c87570d6b7fc3258397","takerBalanceNewAmount":"8842592592592592593","takerBalanceOldAmount":"8800000000000000001","timestamp":1534051203,"type":"trade"}}]

### add-chatmsg

Adds a chat message. If `admin` is populated then the message is considered to be from a site admin.

Request:

    {"op":"add-chatmsg","id":5}
    {"nick":"SportCryptDev","text":"MLB lines are up.","admin":"ADMIN_KEY_GOES_HERE"}

Response:

    {"id":5}
    {"status":"ok"}


## Server Ops

If a message from the server does not contain an `id`, or is an `id` in response to a `sub` or `match-info` op from the client, a JSON array will be returned as the message body. Each element in the array is an object that contains an `op` field.

For most data types there are 2 corresponding operations, `X-new` and `X-latest`. The `-new` op provides the data, and the `-latest` op provides the resume number.

### bulletin-new / bulletin-latest

This contains some miscellaneous information such as the current gas pricing info, and live scores.

<pre>
  {
    "bulletin": {
      "gasinfo": {
        "1": {
          "average": 20,
          "avgWait": 0.7,
          "blockNum": 5995262,
          "block_time": 15.1989795918367,
          "fast": 30,
          "fastWait": 0.5,
          "fastest": 200,
          "fastestWait": 0.5,
          "safeLow": 20,
          "safeLowWait": 0.7,
          "speed": 0.998204403383016,
          "timestamp": 1532049569
        }
      },
      "scores": {
        "3bb8fa63808ca1233afaa41a8dbad41ab35d11fadbe9eab138db88f4bd3c1e14": [
          14,
          17
        ],
        "af80c1dd4598bed90f0ad1a31620090ff859c98b7465083c87f4dd1b15e8c725": [
          4,
          6
        ]
      }
    },
    "op": "bulletin-new"
  },
  {
    "latest": 32520,
    "op": "bulletin-latest"
  },
</pre>

NOTE: This is not the best way to do the live scores, this was a hack.


### chatmsg-new / chatmsg-latest

Contains chat messages. If the `admin` key is true, this was originated from an admin. `ip`s are deterministically obfuscated. `nick` should not be relied upon, users can change it to whatever they want.

<pre>
  {
    "chatmsg": {
      "admin": true,
      "id": 1228,
      "ip": "bc6c300b1f747512",
      "nick": "SportCryptDev",
      "text": "anon9644 - You mean across all your positions? That is really good idea actually, would help with bankroll management",
      "time": 1532049480
    },
    "op": "chatmsg-new"
  },
  {
    "chatmsg": {
      "id": 1229,
      "ip": "a188112ed28218f2",
      "nick": "anon5081",
      "text": "SC: yes, all positions.  thx. ",
      "time": 1532049731
    },
    "op": "chatmsg-new"
  },
  {
    "latest": 1229,
    "op": "chatmsg-latest"
  },
</pre>


### match-new / match-latest

Match info as described in section 2.1 of the whitepaper.

`linkid` is an internal identifier that will be same for different contracts for the same event (ie totals and point spreads).

<pre>
  {
    "match": {
      "details": {
        "cancelPrice": "50",
        "contractAddr": "37304b0ab297f13f5520c523102797121182fb5b",
        "event": {
          "kickoff": "1532047500",
          "league": "Copa Bridgestone Sudamericana",
          "region": "CONMEBOL",
          "spread": "-0.5",
          "team1": "Rampla",
          "team2": "Santa Fe Bogota"
        },
        "nonce": "RbTCJEI4eLC0dNEXSucLBG",
        "recoveryWeeks": "12",
        "type": "sports/soccer/game"
      },
      "id": "bf2950810feab9a6ccb8bc92f7174950f0c257158afa9438ab743a8d1d97320c",
      "linkid": "c54355da2bd517a653e62ca87fd067dc617a88c2b704cf791cda18a13a54d0c4"
    },
    "op": "match-new"
  },
  {
    "latest": 6555,
    "op": "match-latest"
  },
</pre>



### order-new / order-latest

Active orders, packed as described in whitepaper section 4.3, and encoded as a hex string.

See the sportcrypt-contract repo for [the code that does order encoding and decoding](https://github.com/sportcrypt/sportcrypt-contract/blob/master/lib/scUtil.js#L104-L157).

<pre>
  {
    "op": "order-new",
    "order": "37304b0ab297f13f5520c523102797121182fb5b04d8e427b4f04903e952bdcefb61e45ef9402ab2c19f8e7b3c087599f5ec320c00000000000000000000000000000000000000000000000000b1a2bc2ec50000005b66488c1428ada6932300834c1ca8e6459e44ab7d6d1aa118a98faff3b50b94e3f42dc6f9c02f580ea369be33424263f5d975aaf016e84632b39a6f24d0ff38c939aba9c4f96daa367e77f55f93fdad025ebdb6b1e6376f8f371d3673ff731c"
  },
  {
    "latest": 2,
    "match": "04d8e427b4f04903e952bdcefb61e45ef9402ab2c19f8e7b3c087599f5ec320c",
    "op": "order-latest"
  },
</pre>

NOTE: Each resume number is specific to the particular match so the resume numbers must be provided as an object keyed by match id when creating the `sub` message. This is a leftover for when clients would only download orders for individual matches.



### txstream-new / txstream-latest

Recent transactions that have hit the blockchain. Used to display "recent trading activity". For this purpose any `type` other than `trade` should be ignored.

<pre>
  {
    "op": "txstream-new",
    "txstream": {
      "block": 5995220,
      "hash": "0x419aa718e835e0b076c2bb0e3018fd386e4b32466405b1aeb8fc6f38f7f0248d",
      "longAmount": "225000000000000000",
      "makerAccount": "0x834c1ca8e6459e44ab7d6d1aa118a98faff3b50b",
      "makerBalanceNewAmount": "799990324358131322",
      "makerBalanceOldAmount": "999518626244923774",
      "matchId": "0xbff3a92fde2210bd7817aca3dd9da05e63fe09188d0cb203a172552be618320c",
      "newLongPosition": "424528301886792451",
      "newShortPosition": "-424528301886792451",
      "orderDirection": "0",
      "orderHash": "0x17592b097b5e2dabe83d13a1da67a85a012852e4edfa067569d70bd26beea0bb",
      "price": "53",
      "shortAmount": "199528301886792452",
      "takerAccount": "0x77bed8137d3c1640d0f45e5cd1be92291d22f7d3",
      "takerBalanceNewAmount": "76689701346411499675",
      "takerBalanceOldAmount": "76914701346411499674",
      "timestamp": 1532048999,
      "type": "trade"
    }
  },
  {
    "latest": 4463,
    "op": "txstream-latest"
  }
</pre>



### tx-new / tx-latest

Transactions created by the account provided in `tx-address` in the `subs` message. Used to implement transaction history. Unlike `txstream`, can go back arbitrarily far in history for the given account.

<pre>
  {
    "op": "tx-new",
    "tx": {
      "block": 326,
      "hash": "0xfc7f31cb709363ce8d90d6788f356c3e3b160f003b9ebaceee7e6e45ec2eeb76",
      "longAmount": "56491228070175437",
      "makerAccount": "0x6f794648e66e4bb155977e07447ea60f864cf816",
      "makerBalanceNewAmount": "5256957463985738485",
      "makerBalanceOldAmount": "5190641674512054276",
      "matchId": "0xff47130a1e026cda641903a83ca2c9bf2a76b254a8a363e0137f1d491b00320c",
      "newLongPosition": "-2",
      "newShortPosition": "2",
      "orderDirection": "1",
      "orderHash": "0x86c5c81180320438bd503f9d3457e9edd9547d381e20fd74d1f5182bd62b0347",
      "price": "46",
      "shortAmount": "66315789473684209",
      "takerAccount": "0x5809b0d509476ce7c95e2c87570d6b7fc3258397",
      "takerBalanceNewAmount": "4979423035982497339",
      "takerBalanceOldAmount": "4922931807912321902",
      "timestamp": 1531842002,
      "type": "trade"
    }
  },
  {
    "latest": 93,
    "op": "tx-latest"
  },
</pre>


### mthist-new / mthist-latest

Stands for "Match Trade History". Requires being subscribed to a match with `mthist`, for example:

<pre>
  {"op":"subs","id":2}
  {"mthist":{"c9983f1c4096078abefdf6648d4045545f343ae124c4ad11adb44197421e320c":0}}
</pre>

The results returned from `mthist-new` are regular transaction records, the same as returned by `tx-new` and `txstream-new`:

<pre>
  {
    "op":"mthist-new",
    "match":"c9983f1c4096078abefdf6648d4045545f343ae124c4ad11adb44197421e320c",
    "mthist":[{"block":6243199,"hash":"0x88787c0546975da6a0c651a634407fdbfb748745c4017441ca03ef3ac313b5fb","longAmount":"175560975609756097","makerAccount":"0x77bed8137d3c1640d0f45e5cd1be92291d22f7d3","makerBalanceNewAmount":"115380056591053161027","makerBalanceOldAmount":"115555617566662917124","matchId":"0xc9983f1c4096078abefdf6648d4045545f343ae124c4ad11adb44197421e320c","newLongPosition":"297560975609756096","newShortPosition":"-297560975609756096","orderDirection":"1","orderHash":"0x752bb125a8a5097278e04cf125dd87c17e62dac6405d0b2f24a3c8254243975e","price":"59","shortAmount":"122000000000000000","takerAccount":"0x58b50543fdace2e6c98d94fb5f8474ce2acae239","takerBalanceNewAmount":"489547038327531","takerBalanceOldAmount":"122489547038327530","timestamp":1535670126,"type":"trade"}]
  },
  {
    "op":"mthist-latest",
    "match":"c9983f1c4096078abefdf6648d4045545f343ae124c4ad11adb44197421e320c",
    "latest":6643
  }
</pre>


### vol-new / vol-latest

This message returns the total trading volume for the last 1 day and 7 days, as well as trading volume for individual matches.

Each volume record is an array of length 2. The first element is volume in microether (0.000001 ETH), and the second is the number of trades.

<pre>
  {
    "op":"vol-new",
    "vol":{
      "1d": [460000,8],
      "7d": [580000,11],
      "match":{
        "021b1053dd4f67382c1908a97b1fa6c21bac5e4f1b2c67d939c331f32630320c": [200000,1]
      }
    }
  },
  {
    "latest":114,
    "op":"vol-latest"
  },
</pre>

Note that unlike the bulletin, the server may send this message incrementally so its values should overwrite the previous values. For example you can use the following code:

    import merge from 'deepmerge';

    let newVolume = merge(oldVolume, vol, { arrayMerge: (destinationArray, sourceArray, options) => sourceArray, });


### hist-new / hist-latest

Deprecated, used to display summarised trading history for a particular match. On next iteration I will redesign this to use the `tx`/`txstream` functionality.
