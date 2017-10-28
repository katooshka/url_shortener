const http = require("http");
const fs = require("fs");
const formidable = require("formidable");
const util = require('util');
const MongoClient = require('mongodb').MongoClient;
const db = require('./config/db');
const assert = require('assert');

const websitePort = 8083;
const mainPage = "home.html"
const alphanumericArray = "bBcCdDfFgGhHjJkKLmMnNpPqQrRsStTvVwWxXzZ234567890".split("");

function displayForm(response) {
    fs.readFile(mainPage, function (err, data) {
        if (err) {
            response.writeHead(404, {
                'Content-Type': 'text/html'
            });
            // response.statusCode = 404;
            response.end("404");
        }
        else {
            response.writeHead(200, {
                'Content-Type': 'text/html'
            });
            response.write(data);
            response.end();
        }
        return;
    })
}

function connect(url) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, function (err, db) {
            if (err) {
                reject("Cannot connect to database.");
            } else {
                resolve(db);
            }
        });
    });
}

function findLongLinks(connection, shortLink) {
    return new Promise((resolve, reject) => {
        var cursor = connection.collection('links').find({ "short-link": shortLink }, { "long-link": 1 });
        cursor.each(function (err, doc) {
            if (err) {
                reject("Error occured while reading database");
            } else {
                if (doc != null) {
                    resolve(doc['long-link'].toString());
                } else {
                    reject("Long link for " + "http://localhost:" + websitePort + "/" + shortLink + " cannot be found");
                }
            }
        });
    })
};

function readForm(connection, request) {
    return new Promise((resolve, reject) => {
        let fieldValue;
        let form = new formidable.IncomingForm();
        form.on('field', function (field, value) {
            fieldValue = value;
        });
        form.on('end', function () {
            resolve(fieldValue);
        });
        form.parse(request);
    });
}

function insertDocument(connection, shortLink, longLink) {
    return new Promise((resolve, reject) => {
        connection.collection('links').insertOne({
            "long-link": longLink,
            "short-link": shortLink
        }, function (err, result) {
            if (err) {
                reject("Error occured while inserting links into database");
            } else {
                resolve();
            }
        });
    })
};

async function handle(request, response) {
    try {
        if (request.method.toLowerCase() === 'get') {
            const address = request.url.substr(1);
            if (address === mainPage) {
                displayForm(response);
            } else if (address != "favicon.ico" ){
                const connection = await connect(db.url);
                const longLink = await findLongLinks(connection, address);
                connection.close();
                response.writeHead(302, {
                    'Location': longLink
                });
                response.end();
            }
        } else if (request.method.toLowerCase() === 'post') {
            const connection = await connect(db.url);
            const longLink = await readForm(connection, request);
            let shortLink = generateShortLink();
            insertDocument(connection, shortLink, longLink);
            response.writeHead(200, {
                'content-type': 'text/plain'
            });
            response.write("Your shortened link is: http://localhost:" + websitePort + "/" + shortLink);
            response.end();
        }
    } catch (e) {
        console.error(e);
        response.end(e);
    };
}

function generateShortLink() {
    let shortLink = "";
    for (let i = 0; i < 10; i++) {
        shortLink += alphanumericArray[Math.floor(Math.random() * alphanumericArray.length)];
    }
    return shortLink;
}

async function main() {
    let server = http.createServer(handle);
    server.listen(websitePort);
}

main();

//TODO: redirect after submit
//TODO: check entry already exists in db