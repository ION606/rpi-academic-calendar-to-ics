const axios = require('axios');
const cheerio = require('cheerio');
const ics = require('ics');
const fs = require('fs');
const express = require('express');

const app = express();
app.use('/CSS', express.static('./CSS'));
app.use('/HTML', express.static('./HTML'));
const url = "https://info.rpi.edu/registrar/academic-calendar";


async function createIcs() {
    return new Promise(async (resolve) => {
        const m = new Map();

        await axios.get(url)
        .then(res => {
            const $ = cheerio.load(res.data)
            const calendar = $('#academicCalendar');
            for (child of calendar.get(0).children) {
                if (child.name) {
                    // if (child.attributes)
                    var tag;
                    const c = new Map();
                    for (sub of child.children) {
                        if (sub.name == 'thead') {
                            tag = sub.children[0].children[0].children[0].data;
                        } else {
                            for (tr of sub.children) {
                                const tchildren = tr.children;
                                const d = tchildren.find((c) => (c.attribs.class == "date"));
                                const a = tchildren.find((c) => (c.attribs.class != "date"));
                                const txt = a.children[0].children[0].data;
                                const href = a.children[0].attribs.href;
                                c.set(d.children[0].data, new Map([['txt', txt], ['href', href]]));
                            }
                        }
                    }

                    m.set(tag, c);
                }
            }
        });

        
        const events = [];
        const unused = [];
        for (const i of m) {
            for (const j of i[1]) {
                const key = j[0];
                const val = j[1];
                var startDate;
                var endDate;

                if (key.indexOf("-") != -1) {
                    const keySplit = key.split(" - ");
                    startDate = new Date(keySplit[0]);
                    endDate = new Date(keySplit[1]);
                } else {
                    startDate = new Date(key);
                    endDate = new Date(key);
                    endDate.setDate(startDate.getDate() + 1);
                }

                const timesStart = [startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), 0, 0];
                const timesEnd = [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), 0, 0];
                
                events.push({
                    calName: "RPI Academic Calendar",
                    title: val.get("txt"),
                    url: val.get("href"),
                    location: val.get('href'),
                    start: timesStart,
                    end: timesEnd
                });
            }
        }

        ics.createEvents(events, (error, value) => {
            if (error) {
                console.log(error)
            }
        
            // console.log(value);
            resolve(value);
            // fs.writeFileSync(`${__dirname}/rpievents.ics`, value)
        })
    });

    // console.log(m.entries().next());

}



app.get('/', (req, res) => {
    res.sendFile('index.html', {root: 'HTML'});
});

app.get('/calendar', (req, res) => {
    res.sendFile('calendar.html', {root: 'HTML'});
})


app.get('/calendar.css', (req, res) => {
    return res.sendFile('calendar.css', { root: 'CSS' });
});

app.get('/main.css', (req, res) => {
    return res.sendFile('main.css', { root: 'CSS' });
});

app.get('/navbar.css', (req, res) => {
    return res.sendFile('navbar.css', { root: 'CSS' });
});


app.get('/createCalendar', async (req, res) => {
    res.set({'Content-Disposition': 'attachment; rpievents.ics','Content-Type': 'text/ics'}); 
    res.send(await createIcs())
});


const port = 5000;
app.listen(port, () => console.log(`App listening on port ${port}`));
