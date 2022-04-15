"""
This script generates the volume visualization stand alone HTML folder.

The generated folder must be served by a web server (not file protocol) to avoic CORS restrictions on data access.
The script uses a number of Python libraries including feedWebGL2 available here:

    https://github.com/AaronWatters/feedWebGL2
"""

import fitsio
import numpy as np
from feedWebGL2 import html_generator


fits_data_file_path = "out_i01_total.fits"
target_folder = "./volume_html"
stride = 5
width = 1500


DEFAULT_TITLE = "Galactic Wavelength Array Isosurface Visualization"

DEFAULT_EXPLANATION = """
<p>
This interactive visualization allows you to explore the
contents of a dense array of values by viewing its slices
and its 3 dimensional iso-surfaces.
</p>

<p>
The Y and Z dimensions of the figure represent a 2 dimensional projection of a galaxy.
The X dimension represents wavelengths.
</p>

<p>
Adjust the isosurface threshold value by moving the colored slider or by clicking on
on the slice images.
</p>

<p>
Rotate the 3 dimensional views by dragging over the dot cloud.
</p>
"""

def main():
    fits=fitsio.FITS(fits_data_file_path)
    data = fits[0]
    array = data.read()
    (I, J, K) = array.shape
    assert J == K
    # Reduce the J/K dimension taking maximum values in square regions.
    S = J//stride
    max_array = np.zeros((I, S, S), dtype=np.float)
    # I'm sure there is a more slick way to do this...
    for i in range(S):
        for j in range(S):
            si = stride * i
            sj = stride * j
            chunk = array[:, si:si+stride, sj:sj+stride]
            rchunk = chunk.reshape((98, stride*stride))
            mchunk = rchunk.max(axis=1)
            max_array[:, i, j] = mchunk
    # Use shifted log scaling for the value range (so the value slider will work).
    lmax_array = np.log(1 + max_array)
    html_generator.generate_volume_html(
        lmax_array, 
        target_folder, 
        force=True,
        width=width,
        title=DEFAULT_TITLE,
        explanation=DEFAULT_EXPLANATION,
        )

if __name__ == "__main__":
    main()
