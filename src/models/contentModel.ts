import { ChangeSet, Text } from "@codemirror/state";
import { Update } from "@codemirror/collab";
import { ClientChanges } from "../types/CodeMirror";
import { Server, Socket } from "socket.io";

export default class DocumentAuthority {
    doc: Text;
    private _updates: Update[] = [];

    constructor(initDoc: string[] = [""], updates?: Update[]) {
        this.doc = Text.of(initDoc);
        if (updates) this._updates = updates;
    }

    public receiveUpdates(
        changes: ClientChanges,
        connection: Server,
        roomId: string
    ) {
        if (changes.version !== this._updates.length) {
            return;
        } else if (changes.version === this._updates.length) {
            changes.updates.forEach((u) => {
                console.log(u.updateJSON);
                const deserializedUpdate = ChangeSet.fromJSON(u.updateJSON);
                this._updates.push({
                    changes: deserializedUpdate,
                    clientID: u.clientID,
                });
                this.doc = deserializedUpdate.apply(this.doc);
            });
            this.sendUpdates(changes, connection, roomId);
        }
    }

    sendUpdates(changes: ClientChanges, connection: Server, roomId: string) {
        connection.to(roomId).emit("serverOpUpdate", {
            version: changes.version,
            updates: changes.updates,
        });
    }

    getUpdates() {
        return this._updates;
    }
}
