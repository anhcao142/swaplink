# Swaplink

## Installation

```
npm install swaplink
```
## How to use
### 1. Config input and output directory
Locate and edit config file at `./config.js`
```
var config = {
    link: './resource/links.csv',
    template: './resource/template.html',
    domain: 'vietlinkads.com', // without http://
    inputDir: './resource/vietlinkads',
    outputDir: './resource/vietlinkads-out'
}
```
### 2. Edit template.html
File `template.html` use [EJS](ejs.co) as html template, read the doc to learn how to use or just follow the example code


**Default variable**: `links` - An array of object(url, name)

Example:
```
<ul>
    <% links.forEach(function (link) {%>
        <a href="<%= link.url %>"><%= link.name %></a>
    <% }) %>
</ul>
```

### 3. Links.csv file format to follow
This file contains all the url and name of the links that are going to insert into file `template.html`. This file must follow the below format in order to work.
```
name, url
ShareCar.vn, http://sharecar.vn
Dat xe tan son nhat bien hoa, http://sharecar.vn/dat-xe-tu-tan-son-nhat-di-toi-bien-hoa
```

## Run
When all file is prepared and config, enter the following command.
```
npm start
```
