import PasteIcon from "@kenstack/icons/Paste";
import Button from "@kenstack/components/AdminIcon";

import { useLibrary } from "../../context";
import useChangeFolder from "../../Folders/useChangeFolder";

export default function PasteButton() {
  const { clipboard, setClipboard, activeFolder } = useLibrary();
  const { saveChangeFolderMutation } = useChangeFolder(activeFolder, true);

  const handlePaste = () => {
    if (clipboard.activeFolder === activeFolder) {
      setClipboard([]);
    } else {
      saveChangeFolderMutation.mutate({
        idArray: clipboard,
        folder: activeFolder,
      });
    }

    /*
    var clipboard = this.state.clipboard;

    if (!clipboard) {
      return;
    }

    var oldFiles = this.state.files.slice();

    // Ensure there are no duplicate files;
    var files = oldFiles.filter((info) =>
      clipboard.find((clip) => info.value === clip.value) ? false : true,
    );

    files = clipboard.concat(files);

    this.setState({
      ...this.resets,
      clipboard: null,
      files: files,
    });

    var order = files
      .reduce((accumulator, value) => {
        accumulator.push(value.value);
        return accumulator;
      }, [])
      .join(",");

    var id_list = clipboard
      .reduce((accumulator, value) => {
        accumulator.push(value.value);
        return accumulator;
      }, [])
      .join(",");

    var post = {
      folder: this.state.folder,
      id_list: id_list,
      order: order,
      trash: this.state.trash,
    };

    */
  };

  return (
    <Button
      key="paste"
      disabled={clipboard.length === 0}
      onClick={handlePaste}
      tooltip="Paste"
    >
      <PasteIcon />
    </Button>
  );
}
