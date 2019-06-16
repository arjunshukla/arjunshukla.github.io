const csv = require('csv-parser');
const fastcsv = require('fast-csv');
const fs = require('fs');
const ws = fs.createWriteStream("results.csv");

var allInstructorHashMap = new Map();
var allMediaDataMap = new Map();
var arrUnapprovedDataList = [];

var allDataHashMap = new Map();

function readApprovedData() {
    fs.createReadStream('data.csv')
        .pipe(csv())
        .on('data', (row) => {
            if (allDataHashMap.get(row.title) == 0) {
                allDataHashMap.set(row.title, allDataHashMap.set(row.title) + 1);
            }
        })
        .on('end', () => {
            console.log('data.csv file successfully processed');
            filterUnapprovedLectures();
        });
}

function readAllMediaData() {
    fs.createReadStream('allMediaData.csv')
        .pipe(csv())
        .on('data', (row) => {
            allDataHashMap.set(row.title, 0);
            allMediaDataMap.set(row.title, fixResultKeys(row));
        })
        .on('end', () => {
            console.log('allMedia.csv file successfully processed');
            console.log('Arr All Media', allMediaDataMap.size);
            console.log('Hasmap count', allDataHashMap.size);
            readApprovedData();
        });
}

function readAllInstructorData() {
    fs.createReadStream('instructors.csv')
        .pipe(csv())
        .on('data', (row) => {
            allInstructorHashMap.set(row._id, row);
        })
        .on('end', () => {
            console.log('instructors.csv file successfully processed');
            console.log('Instructor count: ', allInstructorHashMap.size);
            readAllMediaData();
        });
}

function fixResultKeys(row) {
    // Get title, URL link, description, objectives, CME credits, and teacher from AllMedia list
    // Lookup arrAllMediaList to get above info
    var newRow = {
        'title': row.title,
        'URL Link': `https://members.drbeen.com/view/${row.slug}/${row.shortId}`, // https://members.drbeen.com/view/drug-abuse/BJlJws8yhX
        'Description': row.shortDescription,
        'Objectives': row.shortDescription,
        'Lecture Duration (hh:mm:ss)': displayDuration(row.duration),
        'CME Credits': calculateCME(Number(row.duration)),
        'Teacher Name': getTeacherName([row.instructors_0_user, row.instructors_1_user, row.instructors_2_user])
    }

    return newRow;
}

async function filterUnapprovedLectures() {
    await allDataHashMap.forEach(logMapElements);
    console.log('Unapproved lectures count:', arrUnapprovedDataList.length);
    saveResults();
}

function logMapElements(value, key, map) {
    if (value == 0) {
        arrUnapprovedDataList.push(allMediaDataMap.get(key));
    }
}

function displayDuration(seconds) {
    const format = val => `0${Math.floor(val)}`.slice(-2)
    const hours = seconds / 3600
    const minutes = (seconds % 3600) / 60

    return [hours, minutes, seconds %= 60].map(format).join(':')
}

function calculateCME(duration) {
    let award = 0;
    award = duration + 15 * 60; // video length plus 15 minutes
    award = award / 60 / 60; // convert to hours
    award = Math.ceil(award * 4) / 4; // ceiling to nearest .25
    return award;
}

function getTeacherName(arrUserKeys) {
    var instructor = '';
    arrUserKeys.forEach(function (userKey) {
        if (userKey != '') {
            instructor = allInstructorHashMap.get(userKey).name;
        }
    });
    return instructor;
}

function saveResults() {
    fastcsv  
    .write(arrUnapprovedDataList, { headers: true })
    .pipe(ws);
}

readAllInstructorData();