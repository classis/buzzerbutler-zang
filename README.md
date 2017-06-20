# buzzerbutler
Project to create an automated butler for apartment buzzing systems to allow multiple phone numbers to be called or passcodes

## How to use

### From Source
1. npm install
2. modify the values in config/default.yml
3. npm start
4. make sure in Zang the all calls come in for the phone number go to {host}/zang

### From Docker
1. docker run classis/buzzerbutler
2. set the following env variables

ZANG_ACCOUNT_SID - id from zang

ZANG_TOKEN - token from Zang

ZANG_LOCATION_NAME - name that gets stated when called

ZANG_PHONE_NUMBER - Zang number that called id uses

BB_DB_PATH - path to store state

You must put into the users api end point PUT {host}/api/users an object that looks like
```json
[
    {
        "_id": "1",
        "name": "joachim",
        "code": "1",
        "verb": "reach",
        "phone": "+15555555555"
    },
    {
        "_id": "2",
        "name": "allie",
        "code": "2",
        "verb": "reach",
        "phone": "+15555555555"
    },
    {
        "_id": "3",
        "name": "passcode",
        "code": "3",
        "verb": "use"
    }
]
```
and access codes PUT {host}/api/accesscodes an other that looks like
```json
[
    {
        "value": "1111",
        "_id": 2
    },
    {
        "value": "2222",
        "_id": 3
    }
]
```
