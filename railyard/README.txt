A centered set of image sprites on a 100 radius patch grid (201 width)
The model is: railyard.html

Notes:

as-app3d:

* SpriteSheets were never designed to be crisp images, simply shapes
  easier to draw in an editor than to build canvas path functions

* So at standard sprite sizes the images were very poor

* An update to the renderer options includes the sprite size within the SpriteSheet

* In the current example, I changed from the default 64 to 1024!

* Still some of the images are not great w/o zooming

* These all pass the tests but There May Be Dragons

railyard.html:

* The layout is pretty crude but at least shows all the images in a grid.

* To update the images,
  - store them in the pngs/ dir
  - run bash mklist.sh
  - cut/paste the output into the model's "paths" array.

* The pngs are huge (125MV), take a long time to load.
  Maybe smaller sizes would improve canvas2d artifacts as well.

* The z value for the turtles is their id, i.e. one patch increase in z
  as the turtles are laid out. Could be too much parallax.