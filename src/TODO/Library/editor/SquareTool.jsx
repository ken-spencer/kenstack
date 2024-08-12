import Provider from "./SquareTool/Provider";

import SquareImage from "./SquareTool/Image";
import Range from "./SquareTool/Range";
import ResetButton from "./SquareTool/ResetButton";

export default function SquareTool({ file }) {
  return (
    <Provider file={file}>
      <div className="admin-library-square-tool">
        <div className="cont">
          <div>
            <Range />
          </div>
          <SquareImage />
          <div>
            <ResetButton />
          </div>
        </div>
      </div>
    </Provider>
  );
}
