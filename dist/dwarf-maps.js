export const DWARF_MAPS={
  "ceres": {
    "texture": "ceres-dawn",
    "source": "https://astrogeology.usgs.gov/search/map/ceres_dawn_fc_global_mosaic_400m",
    "note": "Реальная монохромная мозаика Dawn FC · NASA/JPL-Caltech/UCLA/MPS/DLR/IDA / USGS · 7383×3691. Разрешение около 400 м/пиксель. Освещение исходных кадров сохранено, полярные области менее полны."
  },
  "pluto": {
    "texture": "pluto-nh",
    "source": "https://science.nasa.gov/resource/pluto-global-color-map/",
    "note": "Реальная цветная мозаика New Horizons MVIC · NASA/JHUAPL/SwRI · 5926×2963. Цвета обработаны; детализация неодинакова. Серые области не засняты, подробности в них не выдуманы."
  }
};

export const DWARF_OBSERVATIONS = {
 haumea:{color:0xd8d9d7, image:"haumea-hubble",source:"https://science.nasa.gov/image-detail/haumea-30jun2015-22-28ok2-final-16x9/",credit:"NASA, ESA и D. Ragozzine · Hubble", caption:"Хаумеа и два её спутника.", ring:{radiusKm:2287,widthKm:70,source:"https://doi.org/10.1038/nature24051"}},
 makemake:{color:0xb99d87, image:"makemake-hubble",source:"https://science.nasa.gov/image-detail/image1-_p1618aw/",credit:"NASA, ESA и A. Parker · Hubble", caption:"Макемаке и спутник MK 2."},
 eris:{color:0xe0dfdb, image:"eris-hubble",source:"https://science.nasa.gov/asset/hubble/hubble-view-of-eris-and-dysnomia/",credit:"NASA, ESA и M. Brown · Hubble", caption:"Эрида и Дисномия."}
};
