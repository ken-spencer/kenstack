export default function cloudinaryToImage(data, filename, transformations) {
  const retval = {
    filename,
    asset_id: data.asset_id,
    public_id: data.public_id,
    version: data.version,
    version_id: data.version_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
    url: data.secure_url,
    asset_folder: data.asset_folder,
    display_name: data.display_name,
    original_filename: data.original_filename,
  };

  if (data.format !== "svg") {
    let index = 0;
    retval.sizes = [];
    for (let [name, transformation] of transformations) {
      let size = data.eager[index];
      index++;
      if (!size) {
        break;
      }

      if (size.transformation !== transformation) {
        throw Error(
          `Image transformation mispatch on size ${name} ${size.transformation} !=  ${transformation}`,
        );
      }

      retval.sizes.push([
        name,
        {
          width: size.width,
          height: size.height,
          format: size.format,
          bytes: size.bytes,
          url: size.secure_url,
          transformation: size.transformation,
        },
      ]);
    }

    // const [og, square] = data.eager;

    // retval.sizes = [
    //   [
    //     "original",
    //     {
    //       width: og.width,
    //       height: og.height,
    //       format: og.format,
    //       bytes: og.bytes,
    //       url: og.secure_url,
    //       transformation: og.transformation,
    //     },
    //   ],

    //   [
    //     "squareThumbnail",
    //     {
    //       square: true,
    //       width: square.width,
    //       height: square.height,
    //       format: square.format,
    //       bytes: square.bytes,
    //       url: square.secure_url,
    //       transformation: square.transformation,
    //     },
    //   ],
    // ];
  }

  return retval;
}
