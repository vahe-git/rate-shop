const {logger} = require('../utils/logger');
const fetch = require('node-fetch');
const rateModel = require('../models/DB_associations').Rate;

const body = '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n' +
        '  <soap:Body>\n' +
        '    <ExchangeRatesByDate xmlns="http://www.cba.am/">\n' +
        '      <date>2019-05-09</date>\n' +
        '    </ExchangeRatesByDate>\n' +
        '  </soap:Body>\n' +
        '</soap:Envelope>';

const cbaRequest = async (req, res) => {
    logger.info('Request to CBA Started - - -');

    await fetch('http://api.cba.am/exchangerates.asmx?op=ExchangeRatesLatest', {
        method: 'post',
        body:    body,
        headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://www.cba.am/ExchangeRatesByDate'
        },
    })
        .then(res => res.text())
        .then(rate => {
            logger.info('Request to CBA Finished - - -')

            async function  Rate_Value  (){
                let arr = rate.split('<ExchangeRate>');
                let valutArr = [];
                let FirstIndex;
                let LastIndex;
                let RateArr = [];
                let rateObj = {}
                arr.shift();
                for (let i=0; i<arr.length; i++){
                    if (arr[i] === ''){
                        arr.splice(i, 1)
                    }
                };
                for (let i=0; i<arr.length; i++){
                    valutArr[i] = arr[i].substr(5, 3)
                    FirstIndex = arr[i].indexOf('<Rate>')
                    LastIndex = arr[i].indexOf('</Rate>')
                    RateArr[i] = arr[i].slice(FirstIndex+6, LastIndex)
                };
                for(let i = 0; i < valutArr.length; i++){
                    rateObj[valutArr[i]] = RateArr[i]
                };
                const rateFormat = Object.entries(rateObj).map(rate => ({
                    iso: rate[0],
                    rateVal: rate[1]
                }))

                //update rate data
                Promise.all(
                    rateFormat.map(async i=>{
                        await rateModel.update(
                            { rateVal: i.rateVal },
                            { where: { iso: i.iso }} ,
                        )
                    })
                );
                //adding rate data
                // const newRate = await rateModel.bulkCreate(rateFormat, { updateOnDuplicate: ['iso', 'rateVal'] })
            };

            Rate_Value()
            return res.status(200).json({rate});
        });
};

module.exports = {
    cbaRequest
}