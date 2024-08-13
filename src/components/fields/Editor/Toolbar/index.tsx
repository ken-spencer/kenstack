/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Icons from "../icons";
import BlockFormatDropDown, {
  blockTypeToBlockName,
} from "./BlockFormatDropDown";
import IconButton from "./IconButton";
import styles from "../editor.module.scss";

import {
  $isCodeNode,
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CODE_LANGUAGE_MAP,
  getLanguageFriendlyName,
} from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isListNode, ListNode } from "@lexical/list";
import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isDecoratorBlockNode } from "@lexical/react/LexicalDecoratorBlockNode";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { $isHeadingNode, $isQuoteNode } from "@lexical/rich-text";
import {} from // $getSelectionStyleValueForProperty,
// $isParentElementRTL,
// $patchStyleText,
// $setBlocksType,
"@lexical/selection";
import { $isTableNode } from "@lexical/table";
import {
  $findMatchingParent,
  $getNearestBlockElementAncestorOrThrow,
  $getNearestNodeOfType,
  mergeRegister,
} from "@lexical/utils";
import {
  $createParagraphNode,
  $getNodeByKey,
  // $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_MODIFIER_COMMAND,
  // LexicalEditor,
  NodeKey,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  TextNode,
} from "lexical";
import { Dispatch, useCallback, useEffect, useState } from "react";
import * as React from "react";
import { IS_APPLE } from "../shared/environment";

import useModal from "../hooks/useModal";
// import catTypingGif from "../images/cat-typing.gif";
// import { $createStickyNode } from "../nodes/StickyNode";
import DropDown, { DropDownItem } from "../ui/DropDown";
// import DropdownColorPicker from "../ui/DropdownColorPicker";
import { getSelectedNode } from "../utils/getSelectedNode";
import { sanitizeUrl } from "../utils/url";
import { EmbedConfigs } from "../plugins/AutoEmbedPlugin";
// import { INSERT_COLLAPSIBLE_COMMAND } from "../plugins/CollapsiblePlugin";
// import { InsertEquationDialog } from "../plugins/EquationsPlugin";
// import { INSERT_EXCALIDRAW_COMMAND } from "../plugins/ExcalidrawPlugin";
/*
import {
  // INSERT_IMAGE_COMMAND,
  InsertImageDialog,
  // InsertImagePayload,
} from "../plugins/ImagesPlugin";
*/
// import { InsertInlineImageDialog } from "../plugins/InlineImagePlugin";
// import InsertLayoutDialog from "../plugins/LayoutPlugin/InsertLayoutDialog";
// import { INSERT_PAGE_BREAK } from "../plugins/PageBreakPlugin";
// import { InsertPollDialog } from "../plugins/PollPlugin";
import { InsertTableDialog } from "../plugins/TablePlugin";

const rootTypeToRootName = {
  root: "Root",
  table: "Table",
};

function getCodeLanguageOptions(): [string, string][] {
  const options: [string, string][] = [];

  for (const [lang, friendlyName] of Object.entries(
    CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  )) {
    options.push([lang, friendlyName]);
  }

  return options;
}

const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions();

function dropDownActiveClass(active: boolean) {
  if (active) return "active dropdown-item-active";
  else return "";
}

function Divider(): JSX.Element {
  return <div className="divider" />;
}

export default function ToolbarPlugin({
  setIsLinkEditMode,
}: {
  setIsLinkEditMode: Dispatch<boolean>;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [blockType, setBlockType] =
    useState<keyof typeof blockTypeToBlockName>("paragraph");
  const [rootType, setRootType] =
    useState<keyof typeof rootTypeToRootName>("root");
  const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
    null,
  );
  // const [fontSize, setFontSize] = useState<string>("15px");
  // const [fontColor, setFontColor] = useState<string>("#000");
  // const [bgColor, setBgColor] = useState<string>("#fff");
  // const [fontFamily, setFontFamily] = useState<string>("Arial");
  const [elementFormat, setElementFormat] = useState<ElementFormatType>("left");
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  // const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [modal, showModal] = useModal();
  // const [isRTL, setIsRTL] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<string>("");
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const $parent = e.getParent();
              return $parent !== null && $isRootOrShadowRoot($parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      // Update text format
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsSubscript(selection.hasFormat("subscript"));
      setIsSuperscript(selection.hasFormat("superscript"));
      // setIsCode(selection.hasFormat("code"));
      // setIsRTL($isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        setRootType("table");
      } else {
        setRootType("root");
      }

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
          if ($isCodeNode(element)) {
            const language =
              element.getLanguage() as keyof typeof CODE_LANGUAGE_MAP;
            setCodeLanguage(
              language ? CODE_LANGUAGE_MAP[language] || language : "",
            );
            return;
          }
        }
      }
      // Handle buttons
      /*
      setFontSize(
        $getSelectionStyleValueForProperty(selection, "font-size", "15px")
      );
      */
      /*
      setFontColor(
        $getSelectionStyleValueForProperty(selection, "color", "#000")
      );
      */
      /*
      setBgColor(
        $getSelectionStyleValueForProperty(
          selection,
          "background-color",
          "#fff"
        )
      );
      */
      /*
      setFontFamily(
        $getSelectionStyleValueForProperty(selection, "font-family", "Arial")
      );
      */
      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
        );
      }

      // If matchingParent is a valid node, pass it's format type
      setElementFormat(
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
            ? node.getFormatType()
            : parent?.getFormatType() || "left",
      );
    }
  }, [activeEditor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        $updateToolbar();
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, activeEditor, editor]);

  useEffect(() => {
    return activeEditor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (payload) => {
        const event: KeyboardEvent = payload;
        const { code, ctrlKey, metaKey } = event;

        if (code === "KeyK" && (ctrlKey || metaKey)) {
          event.preventDefault();
          let url: string | null;
          if (!isLink) {
            setIsLinkEditMode(true);
            url = sanitizeUrl("https://");
          } else {
            setIsLinkEditMode(false);
            url = null;
          }
          return activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [activeEditor, isLink, setIsLinkEditMode]);

  /*
  useEffect(() => {
    return activeEditor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (payload) => {
        const event: KeyboardEvent = payload;
        const { code, ctrlKey, metaKey } = event;

        if (code === "KeyK" && (ctrlKey || metaKey)) {
          event.preventDefault();
          if (!isLink) {
            setIsLinkEditMode(true);
          } else {
            setIsLinkEditMode(false);
          }
          return activeEditor.dispatchCommand(
            TOGGLE_LINK_COMMAND,
            sanitizeUrl("https://")
          );
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [activeEditor, isLink, setIsLinkEditMode]);
  */

  /*
  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($INTERNAL_isPointSelection(selection)) {
          $patchStyleText(selection, styles);
        }
      });
    },
    [activeEditor]
  );
  */

  const clearFormatting = useCallback(() => {
    activeEditor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        const nodes = selection.getNodes();

        if (anchor.key === focus.key && anchor.offset === focus.offset) {
          return;
        }

        nodes.forEach((node, idx) => {
          // We split the first and last node by the selection
          // So that we don't format unselected text inside those nodes
          if ($isTextNode(node)) {
            let textNode = node as TextNode;
            if (idx === 0 && anchor.offset !== 0) {
              textNode = textNode.splitText(anchor.offset)[1] || textNode;
            }
            if (idx === nodes.length - 1) {
              textNode = textNode.splitText(focus.offset)[0] || textNode;
            }

            if (textNode.__style !== "") {
              textNode.setStyle("");
            }

            if (textNode.__format !== 0) {
              textNode.setFormat(0);
              $getNearestBlockElementAncestorOrThrow(textNode).setFormat("");
            }
          } else if ($isHeadingNode(node) || $isQuoteNode(node)) {
            node.replace($createParagraphNode(), true);
          } else if ($isDecoratorBlockNode(node)) {
            node.setFormat("");
          }
        });
      }
    });
  }, [activeEditor]);

  /*
  const onFontColorSelect = useCallback(
    (value: string) => {
      applyStyleText({ color: value });
    },
    [applyStyleText]
  );
  */

  /*
  const onBgColorSelect = useCallback(
    (value: string) => {
      applyStyleText({ "background-color": value });
    },
    [applyStyleText]
  );
  */

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl("https://"));
    } else {
      setIsLinkEditMode(false);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink, setIsLinkEditMode]);

  /*
  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl("https://"));
    } else {
      // editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);
  */

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );
  /*
  const insertGifOnClick = (payload: InsertImagePayload) => {
    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
  };
  */

  return (
    <div className={styles.toolbar}>
      <button
        disabled={!canUndo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        title={IS_APPLE ? "Undo (⌘Z)" : "Undo (Ctrl+Z)"}
        type="button"
        className="toolbar-item spaced"
        aria-label="Undo"
      >
        <Icons.Undo />
      </button>
      <button
        disabled={!canRedo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        title={IS_APPLE ? "Redo (⌘Y)" : "Redo (Ctrl+Y)"}
        type="button"
        className="toolbar-item"
        aria-label="Redo"
      >
        <Icons.Redo />
      </button>
      <Divider />
      {blockType in blockTypeToBlockName && activeEditor === editor && (
        <>
          <BlockFormatDropDown
            disabled={!isEditable}
            blockType={blockType}
            rootType={rootType}
            editor={editor}
          />
          <Divider />
        </>
      )}
      {blockType === "code" ? (
        <DropDown
          disabled={!isEditable}
          buttonClassName="toolbar-item code-language"
          buttonLabel={getLanguageFriendlyName(codeLanguage)}
          buttonAriaLabel="Select language"
        >
          {CODE_LANGUAGE_OPTIONS.map(([value, name]) => {
            return (
              <DropDownItem
                className={`item ${dropDownActiveClass(
                  value === codeLanguage,
                )}`}
                onClick={() => onCodeLanguageSelect(value)}
                key={value}
              >
                <span className="text">{name}</span>
              </DropDownItem>
            );
          })}
        </DropDown>
      ) : (
        <>
          <button
            disabled={!isEditable}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
            }}
            className={"toolbar-item spaced " + (isBold ? "active" : "")}
            title={IS_APPLE ? "Bold (⌘B)" : "Bold (Ctrl+B)"}
            type="button"
            aria-label={`Format text as bold. Shortcut: ${
              IS_APPLE ? "⌘B" : "Ctrl+B"
            }`}
          >
            <Icons.Bold />
          </button>
          <button
            disabled={!isEditable}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
            }}
            className={"toolbar-item spaced " + (isItalic ? "active" : "")}
            title={IS_APPLE ? "Italic (⌘I)" : "Italic (Ctrl+I)"}
            type="button"
            aria-label={`Format text as italics. Shortcut: ${
              IS_APPLE ? "⌘I" : "Ctrl+I"
            }`}
          >
            <Icons.Italic />
          </button>
          <button
            disabled={!isEditable}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
            }}
            className={"toolbar-item spaced " + (isUnderline ? "active" : "")}
            title={IS_APPLE ? "Underline (⌘U)" : "Underline (Ctrl+U)"}
            type="button"
            aria-label={`Format text to underlined. Shortcut: ${
              IS_APPLE ? "⌘U" : "Ctrl+U"
            }`}
          >
            <Icons.Underline />
          </button>
          {/*
          <button
            disabled={!isEditable}
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
            }}
            className={"toolbar-item spaced " + (isCode ? "active" : "")}
            title="Insert code block"
            type="button"
            aria-label="Insert code block"
          >
            <Icons.Code />
          </button>
        */}
          <button
            disabled={!isEditable}
            onClick={insertLink}
            className={"toolbar-item spaced " + (isLink ? "active" : "")}
            aria-label="Insert link"
            title="Insert link"
            type="button"
          >
            <Icons.Link />
          </button>

          <DropDown
            disabled={!isEditable}
            buttonClassName="toolbar-item spaced"
            buttonLabel=""
            buttonAriaLabel="Formatting options for additional text styles"
            // buttonIconClassName="icon dropdown-more"
            buttonIcon={<Icons.DropdownMore />}
          >
            <DropDownItem
              onClick={() => {
                activeEditor.dispatchCommand(
                  FORMAT_TEXT_COMMAND,
                  "strikethrough",
                );
              }}
              className={"item " + dropDownActiveClass(isStrikethrough)}
              title="Strikethrough"
              aria-label="Format text with a strikethrough"
            >
              <Icons.Strikethrough />
              <span className="text">Strikethrough</span>
            </DropDownItem>
            <DropDownItem
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript");
              }}
              className={"item " + dropDownActiveClass(isSubscript)}
              title="Subscript"
              aria-label="Format text with a subscript"
            >
              <Icons.Subscript />
              <span className="text">Subscript</span>
            </DropDownItem>
            <DropDownItem
              onClick={() => {
                activeEditor.dispatchCommand(
                  FORMAT_TEXT_COMMAND,
                  "superscript",
                );
              }}
              className={"item " + dropDownActiveClass(isSuperscript)}
              title="Superscript"
              aria-label="Format text with a superscript"
            >
              <Icons.Superscript />
              <span className="text">Superscript</span>
            </DropDownItem>
            <DropDownItem
              onClick={clearFormatting}
              className="item"
              title="Clear text formatting"
              aria-label="Clear all text formatting"
            >
              <Icons.Clear />
              <span className="text">Clear Formatting</span>
            </DropDownItem>
          </DropDown>
          <Divider />

          <IconButton
            active={(elementFormat || "left") === "left"}
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left");
            }}
            title="Left Align"
            icon={<Icons.LeftAlign />}
          />

          <IconButton
            active={elementFormat === "center"}
            title="Center Align"
            onClick={() => {
              editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center");
            }}
            icon={<Icons.CenterAlign />}
          />

          <IconButton
            onClick={() => {
              editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
            }}
            icon={<Icons.Indent />}
            title="Indent"
          />

          <IconButton
            onClick={() => {
              editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
            }}
            title="Outdent"
            icon={<Icons.Outdent />}
          />

          <Divider />
          {rootType === "table" && (
            <>
              <DropDown
                disabled={!isEditable}
                buttonClassName="toolbar-item spaced"
                buttonLabel="Table"
                buttonAriaLabel="Open table toolkit"
                buttonIconClassName="icon table secondary"
              >
                <DropDownItem
                  onClick={() => {
                    /**/
                  }}
                  className="item"
                >
                  <span className="text">TODO</span>
                </DropDownItem>
              </DropDown>
              <Divider />
            </>
          )}
          <DropDown
            disabled={!isEditable}
            buttonClassName="toolbar-item spaced"
            // buttonLabel="Insert"
            buttonAriaLabel="Insert menu"
            //buttonIconClassName="icon plus"
            buttonIcon={<Icons.ThreeDotsVertical />}
          >
            <DropDownItem
              onClick={() => {
                activeEditor.dispatchCommand(
                  INSERT_HORIZONTAL_RULE_COMMAND,
                  undefined,
                );
              }}
              className="item"
            >
              <Icons.HorizontalRule />
              <span className="text">Horizontal Rule</span>
            </DropDownItem>
            {/*
            <DropDownItem
              onClick={() => {
                activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
              }}
              className="item"
            >
              <i className="icon page-break" />
              <span className="text">Page Break</span>
            </DropDownItem>
          */}
            {/*
            <DropDownItem
              onClick={() => {
                showModal("Insert Image", (onClose) => (
                  <InsertImageDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item"
            >
              <Icons.Image />
              <span className="text">Image</span>
            </DropDownItem>
          */}
            {/*
            <DropDownItem
              onClick={() => {
                showModal("Insert Inline Image", (onClose) => (
                  <InsertInlineImageDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item"
            >
              <Icons.Image />
              <span className="text">Inline Image</span>
            </DropDownItem>
            */}
            <DropDownItem
              onClick={() => {
                showModal("Insert Table", (onClose) => (
                  <InsertTableDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item"
            >
              <Icons.Table />
              <span className="text">Table</span>
            </DropDownItem>
            {/*
            <DropDownItem
              onClick={() => {
                showModal("Insert Poll", (onClose) => (
                  <InsertPollDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item"
            >
              <i className="icon poll" />
              <span className="text">Poll</span>
            </DropDownItem>
          */}
            {/*
            <DropDownItem
              onClick={() => {
                showModal("Insert Columns Layout", (onClose) => (
                  <InsertLayoutDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item"
            >
              <i className="icon columns" />
              <span className="text">Columns Layout</span>
            </DropDownItem>
          */}
            {/*
            <DropDownItem
              onClick={() => {
                showModal("Insert Equation", (onClose) => (
                  <InsertEquationDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item"
            >
              <i className="icon equation" />
              <span className="text">Equation</span>
            </DropDownItem>
          */}
            {/*
            <DropDownItem
              onClick={() => {
                editor.update(() => {
                  const root = $getRoot();
                  const stickyNode = $createStickyNode(0, 0);
                  root.append(stickyNode);
                });
              }}
              className="item"
            >
              <i className="icon sticky" />
              <span className="text">Sticky Note</span>
            </DropDownItem>
          */}
            {/*
            <DropDownItem
              onClick={() => {
                editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
              }}
              className="item"
            >
              <i className="icon caret-right" />
              <span className="text">Collapsible container</span>
            </DropDownItem>
          */}
            {EmbedConfigs.map((embedConfig) => (
              <DropDownItem
                key={embedConfig.type}
                onClick={() => {
                  activeEditor.dispatchCommand(
                    INSERT_EMBED_COMMAND,
                    embedConfig.type,
                  );
                }}
                className="item"
              >
                {embedConfig.icon}
                <span className="text">{embedConfig.contentName}</span>
              </DropDownItem>
            ))}
          </DropDown>
        </>
      )}

      {modal}
    </div>
  );
}
