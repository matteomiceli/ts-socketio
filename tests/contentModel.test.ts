import { Update } from "@codemirror/collab";
import { Text } from "@codemirror/text";
import { ChangeSet } from "@codemirror/state";

import { ClientChanges } from "../src/types/CodeMirror";
import DocumentAuthority from "../src/models/contentModel";
import * as client from "socket.io-client";
import { io } from "../server";
import socket from "../src/controller/socket";
import { Server, Socket } from "socket.io";
import getBodyData from "../src/controller/github";

// TESTS
describe("Initializing new document authority", () => {
    const doc = new DocumentAuthority(undefined);
    test("Blank document", () => {
        console.log(doc.doc);
        expect(doc.doc).toEqual(Text.of([""]));
    });

    test("Empty update history", () => {
        expect(doc.getUpdates().length).toEqual(0);
    });
});

describe("Initialize document authority with existing data", () => {
    const { doc, updates } = mockDocumentAuthority();

    test("Document has been seeded by constructor", () => {
        expect(doc.doc).toEqual(Text.of(["sdf"]));
    });

    test("Updates seeded by constructor", () => {
        expect(doc.getUpdates()).toBe(updates);
    });
});

describe("Passing client changes to Document Authority", () => {
    let doc: DocumentAuthority;
    let socket: client.Socket;

    beforeAll(() => {
        const d: { doc: DocumentAuthority; updates: Update[] } =
            mockDocumentAuthority();
        doc = d.doc;

        mockSocketServer();
        socket = mockClient();
    });
    afterAll(() => {
        io.close();
        socket.close();
    });

    test("Insert 'j' at end of the line", () => {
        let clientChanges = {
            version: doc.getUpdates().length,
            updates: [
                {
                    updateJSON: [3, [0, "j"]],
                    clientID: "ci9k21",
                },
            ],
        };
        doc.receiveUpdates(clientChanges, io, "0000");
        expect(doc.doc).toEqual(Text.of(["sdfj"]));
        expect(doc.getUpdates().length).toBe(4);
    });

    test("Delete character at index 3 end of the line", () => {
        let clientChanges = {
            version: doc.getUpdates().length,
            updates: [
                {
                    updateJSON: [3, [1]],
                    clientID: "ci9k21",
                },
            ],
        };
        doc.receiveUpdates(clientChanges, io, "0000");
        expect(doc.doc).toEqual(Text.of(["sdf"]));
        expect(doc.getUpdates().length).toBe(5);
    });

    test("Delete three characters at index 2 and insert 'hello'", () => {
        let clientChanges = {
            version: doc.getUpdates().length,
            updates: [
                {
                    updateJSON: [[3, "hello"]],
                    clientID: "ci9k21",
                },
            ],
        };
        doc.receiveUpdates(clientChanges, io, "0000");
        expect(doc.doc).toEqual(Text.of(["hello"]));
        expect(doc.getUpdates().length).toBe(6);
    });

    test("Split to new line at index 3", () => {
        let clientChanges = {
            version: doc.getUpdates().length,
            updates: [
                {
                    updateJSON: [3, [0, "", ""], 2],
                    clientID: "ci9k21",
                },
            ],
        };
        doc.receiveUpdates(clientChanges, io, "0000");
        expect(doc.doc).toEqual(Text.of(["hel", "lo"]));
        expect(doc.getUpdates().length).toBe(7);
    });
});

// HELPERS
// mocks a document with a starting value and update history
function mockDocumentAuthority(
    mockument: string[] = ["sdf"],
    serializedChanges: any = [[[0, "s"]], [1, [0, "d"]], [2, [0, "f"]]]
) {
    const deserializedChanges: ChangeSet[] = serializedChanges.map(
        (u: Array<number | string>) => {
            return ChangeSet.fromJSON(u);
        }
    );
    const updates: Update[] = [];
    deserializedChanges.forEach((u) => {
        updates.push({ changes: u, clientID: "ci9k21" });
    });

    return {
        doc: new DocumentAuthority(mockument, updates),
        updates,
        mockument,
        serializedChanges,
    };
}

function mockSocketServer() {
    socket(io);
}

function mockClient() {
    const socket = client.io("http://localhost:8080/");
    return socket;
}
