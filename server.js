const http = require("http");
const fs = require("fs");
const formidable = require("formidable");
const util = require('util');
const MongoClient = require('mongodb').MongoClient;
const db = require('./config/db');
const assert = require('assert');
const url = require('url');
const express = require('express')
const app = express();

const websitePort = 8083;
const mainPage = "home.html"
const alphanumericArray = "bBcCdDfFgGhHjJkKLmMnNpPqQrRsStTvVwWxXzZ234567890".split("");

async function main() {

    app.use(express.static('static'));

    app.get('/shorten', async function (req, res) {
        const connection = await connect(db.url);
        const longLink = req.query.link;
        const shortLink = generateShortLink();
        insertDocument(connection, shortLink, longLink);
        connection.close();
        res.append('Content-Type', 'text/html');
        res.write("Your shortened link is: http://localhost:" + websitePort + "/" + shortLink);
        res.send();
    })

    app.get('*', async function (req, res) {
        let reg = /^\/[bBcCdDfFgGhHjJkKLmMnNpPqQrRsStTvVwWxXzZ234567890]{10}$/;
        if (req.path.match(reg) != null) {
            const connection = await connect(db.url);
            const longLink = await findLongLinks(connection, req.path);
            connection.close();
            res.redirect(longLink);
        } else {
            res.send("404");
        }
    });

    app.listen(websitePort);
}

function connect(address) {
    return new Promise((resolve, reject) => {
        MongoClient.connect(address, function (err, db) {
            if (err) {
                reject("Cannot connect to database.");
            } else {
                resolve(db);
            }
        });
    });
}

function generateShortLink() {
    let shortLink = "";
    for (let i = 0; i < 10; i++) {
        shortLink += alphanumericArray[Math.floor(Math.random() * alphanumericArray.length)];
    }
    return shortLink;
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

function findLongLinks(connection, shortLink) {
    return new Promise((resolve, reject) => {
        shortLink = shortLink.replace(/^\//, '');
        let cursor = connection.collection('links').find({ "short-link": shortLink }, { "long-link": 1 });
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

main();

//TODO: check entry already exists in db