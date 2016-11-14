var cheerio = require('cheerio');
var fs      = require('fs');
var config  = require('./config');
var path    = require('path');
var join    = require('path').join;
var async   = require('async');
var ejs     = require('ejs');
var csv     = require('fast-csv');
var mkdirp  = require('mkdirp');



var filesPath = './resource/filesPath.csv';
var fileCountPath = './resource/fileCount';
var fileCount = 0;
var dirCount  = 0;



// Main
async.series([
    function (callback) {
        findHtmlFiles(callback);
    }],
    function done(err) {
        loadHtmlFiles();
    })




function loadHtmlFiles() {
    var remaining = '';
    var rs = fs.createReadStream(join(__dirname, filesPath), {encoding: 'utf8'});
    var processFileCount = 0;

    var curRound = 0;
    var finishRound = -1;

    rs.on('finish', function () {
        finishRound = curRound;
    })

    loadTemplate(function (err, templateHtml) {
        rs.on('data', chunk => {
            // console.log('Read round:', ++curRound);
            var files   = chunk.split(',');

            files[0]    = remaining + files[0];
            remaining   = files.splice(files.length - 1, files.length)[0];

            async.eachLimit(files, 5, (file, callback) => {
                if (file.indexOf('.html') === -1) {
                    copyFile(file);
                    return callback();
                } else {
                    fs.readFile(join(__dirname, config.inputDir, file), 'utf8', (err, html) => {
                        if (err) return callback(err);

                        var newHtml = swapLink(html, templateHtml);
                        writeFile(file, newHtml);

                        callback();
                    })
                }
            }, function (err) {
                if (err) return console.log(err.stack);

                processFileCount += files.length;
                console.log('Progress:', processFileCount + '/' + fileCount, 'files');

                if (curRound == finishRound) {
                    console.log('Done');
                }
            })
        })
    })
}


function writeFile(file, data, callback) {
    var dir = path.dirname(join(config.outputDir, file));
    createDirIfNotExist(dir, err => {
        if (err) return callback(err);

        fs.writeFile(join(__dirname, config.outputDir, file), data, callback);
    })
}


function copyFile(file) {
    var isEnd = false;
    var dir = path.dirname(join(config.outputDir, file));
    createDirIfNotExist(dir, (err) => {
        if (err) console.log(err);

        var rs = fs.createReadStream(join(__dirname, config.inputDir, file));
        var ws = fs.createWriteStream(join(__dirname, config.outputDir, file));

        rs.pipe(ws);

        rs.on('error', function (err) {
            if (err) console.log(err);
        })

        ws.on('error', function (err) {
            if (err) console.log(err);
        })
    })
}

function createDirIfNotExist(dir, callback) {
    var fullpath = path.resolve(dir);

    fs.lstat(fullpath, function (err, file) {
        if (err) {
            mkdirp(fullpath, callback);
        } else {
            callback();
        }
    })
}


function findHtmlFiles(callback) {
    var allDirs = [config.inputDir];
    var ws      = fs.createWriteStream(join(__dirname, filesPath));

    console.log('Counting files...');

    ws.on('error', function (err) {
        console.log(err);
    });


    async.whilst(
        function asyncWhilst() {
            return allDirs.length > 0;
        },
        function asyncDo(callback) {
            var curDir  = allDirs.splice(0, 1)[0];


            readFilesDeep(curDir, (err, files, dirs) => {
                if (err) throw err;

                fileCount   += files.length;
                dirCount    += dirs.length;

                // Append directory list
                allDirs     = allDirs.concat(dirs);

                files       = files.map(file => {
                    return path.resolve(file).split(path.resolve(config.inputDir))[1];
                })

                // Write all file path to file for later usage
                writeFilesPath(ws, files);

                callback();
            });
        },
        function done() {
            ws.end();
            fs.writeFileSync(join(__dirname, fileCountPath), fileCount);
            console.log('Finish, total files:', fileCount);


            callback();
        })
}



function swapLink(html, templateHtml) {
    var $ = cheerio.load(html);

    $('body').prepend(templateHtml);

    return $.html();
}



function loadTemplate(callback) {
    var csvPath = join(__dirname, config.link);

    var links = [];
    var stream = fs.createReadStream(csvPath);
    var csvStream = csv({headers: true}).on('data', function (data) {
        links.push(data);
    }).on('end', function () {
        var templatePath = join(__dirname, config.template);
        fs.readFile(templatePath, 'utf8', function (err, html) {
            if (err) return callback(err);

            var templateHtml = ejs.render(html, {links: links});
            callback(null, templateHtml);
        })
    })

    stream.pipe(csvStream);
}



function writeFilesPath(writeStream, filesPath) {
    if (!writeStream) throw new Error("Write stream is undefined");

    for (var path of filesPath) {
        writeStream.write(path + ',');
    }
}


function readFilesDeep(dir, callback) {
    var foundFiles  = [];
    var foundDirs   = [];

    fs.readdir(path.resolve(dir), (err, files) => {
        async.eachLimit(files, 5, (file, callback) => {

            // Check and return if the file is a directory or file
            fs.lstat(path.resolve(join(dir, file)), (err, stats) => {
                if (err) return callback(err);

                if (stats.isDirectory())
                    foundDirs.push(join(dir, file));
                else {
                    foundFiles.push(join(dir, file));
                }

                callback();
            })
        }, function (err) {
            callback(err, foundFiles, foundDirs);
        });
    });
}

