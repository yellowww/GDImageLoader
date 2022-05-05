
<img src="github/assets/header.png" alt="title"></img>
---
# <div align="center">An easy way to import images into Geometry Dash while preserving quality.</div>
 
 <br>
 <br>

## Instalation:

 1. If you do not have Node.js, make sure to download it (<a href="https://nodejs.org">here</a>) <br> You can check to see if it properly installed by runing `node --version` in a command prompt

 1. Download and unzip this repository or clone it to your computer

 1. Open a command prompt and run `node 'absolutePath'/main.js` to start the program.<br>
    You can get the absolute path by shift + right clicking the file and selecting "copy as path"

 1. Follow the prompts to load the image into your geometry dash level.
<br>

---

## GDImageLoader:

Most other Geometry Dash image loaders use standard rendering, loading each pixel as a different object. This can cause massive lag with images that have high resolutions.

This program optimizes the amount of objects used, as well as the quality of the image through raster vectorization. 
<br>
It will try to turn groups of pixels into primitive objects, such as triangles, circles, and squares. This will ultimatly lead to a much lower object count, while still maintaining quality.

<table>
    <tr width="500">
        <td align="center" width="50%">Standard render</td>
        <td align="center" width="50%">Vector render</td>
    </tr>
    <tr width="500">
        <td width="500" align="center">
           <img src="github/assets/standard.png" width="95%">
        </td>
        <td align="center">
           <img src="github/assets/PrimSet.png" width="95%">
        </td>
    </tr>
    <td align="center" colspan="2">
       Both of these use 3,826 objects
    </td>
</table>

> View [config](github/assets/catExample) used to create these images 

The results you get may vary based on your configuration. It may take some time tuning the values to maximize the efectiveness of this render system.
