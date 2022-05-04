<style>
    .imageRender {
        width:40vw;
        max-width:8cm;
        text-align:center;
        display:inline-block;
        font-weight:bold;
    }

    .header {
        width:100vw;
    }
    .imageRenderContainer {
        width:90vw;
        text-align:center;
    }
</style>

<img src="github/assets/header.png" class="header" alt="title"></img>

# An easy way to import images into Geometry Dash while preserving quality.
 ---
 <br>
 <br>

## Instalation:

 1. If you do not have Node.js, make sure to download it (<a href="https://nodejs.org">here</a>) <br> You can check to see if it properly installed by runing `node --version` in a command prompt

 1. Download and unzip this repository or clone it to your computer

 1. Open a command prompt and run `node 'fullPathToProgram' /main.js` to start the program.

 1. Follow the prompts to load the image into your geometry dash level.
<br>
---
## GDImageLoader:

Most other Geometry Dash image loaders use standard rendering, loading each pixel as a different object. This can cause massive lag with images that have high resolutions.

This program optimizes the amount of objects used, as well as the quality of the image through raster vectorization. 
<br>
It will try to turn groups of pixels into primitive objects, such as triangles, circles, and squares. This will ultimatly lead to a much lower object count, while still maintaining quality.
<div class="imageRenderContainer">
    <div class="imageRender">Standard render</div>
    <div class="imageRender">Vector render</div>
    <img src="github/assets/standard.png" class="imageRender"></img>
    <img src="github/assets/primset.png" class="imageRender"></img>
    <div>Both these images use 3826 objects</div>
</div>
<br>

The results you get may vary based on your configuration. It may take some time tuning the values to maximize the efectiveness of this render system.
