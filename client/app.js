import { EditorState, basicSetup, EditorView } from "@codemirror/basic-setup";
import { sendableUpdates, receiveUpdates, collab } from "@codemirror/collab";
import { markdown } from "@codemirror/lang-markdown";
import { ViewPlugin } from "@codemirror/view";

const send = document.getElementById("send");
const github = document.getElementById("github");
const roomEl = document.getElementById("roomId");
const vim = document.getElementById("toggleVim");

const socket = io("http://localhost:8080/");
const roomId = "3265";
roomEl.innerHTML = "room id: " + roomId;

socket.emit("join", roomId);

// CODEMIRROR
const state = EditorState.create({
    extensions: [
        basicSetup,
        markdown(),
        collab(),
        EditorView.lineWrapping,
        createClient()
    ],
})

let view = new EditorView({
    state,
    parent: document.body,
});

function createClient() {
    let plugin = ViewPlugin.define((view) => ({
        update(editorUpdate) {
            if (editorUpdate.docChanged) {
                console.log(editorUpdate.changes)
            }
        }
    }))
    return plugin;
}

console.log(view.state);
