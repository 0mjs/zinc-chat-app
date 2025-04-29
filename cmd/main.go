package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/0mjs/zinc"
)

type ChatMessage struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	User    string `json:"user"`
	Room    string `json:"room"`
}

func main() {
	app := zinc.New()
	ws := zinc.WebSocket()
	app.SetWebSocketHandler(ws)

	tmpl := zinc.NewTemplateEngine("public",
		zinc.WithExtension(".html"),
		zinc.WithStaticDir("public"),
	)
	if err := tmpl.LoadTemplates(); err != nil {
		log.Fatalf("Failed to load templates: %v", err)
	}
	app.SetTemplateEngine(tmpl)

	tmpl.Static(app)

	app.Get("/", func(c *zinc.Context) error {
		c.Set("app", app)
		return c.Render("index", nil)
	})

	app.Get("/ws/:room/:user", func(c *zinc.Context) error {
		room := c.Param("room")
		user := c.Param("user")
		c.Set("app", app)

		conn, err := c.Upgrade()
		if err != nil {
			log.Printf("Error upgrading to WebSocket: %v", err)
			return c.Status(http.StatusInternalServerError).Send("WebSocket upgrade failed")
		}

		c.JoinRoom(room, conn)
		log.Printf("User %s joined room: %s", user, room)

		joinMsg := ChatMessage{
			Type:    "join",
			User:    user,
			Room:    room,
			Message: user + " has joined the room",
		}
		msgBytes, _ := json.Marshal(joinMsg)
		c.BroadcastToRoom(room, msgBytes)

		go handleChat(ws, conn, room, user)

		return nil
	})

	app.Serve(":3000")
}

func handleChat(ws *zinc.WebSocketHandler, conn *zinc.WebSocketConn, room, user string) {
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Failed to read message, user %s kicked from room %s: %v", user, room, err)
			ws.LeaveRoom(room, conn)

			leaveMsg := ChatMessage{
				Type:    "leave",
				User:    user,
				Room:    room,
				Message: user + " has left the room",
			}
			msgBytes, _ := json.Marshal(leaveMsg)
			ws.BroadcastToRoom(room, msgBytes)
			break
		}

		var msg ChatMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		msg.User = user
		msg.Room = room

		msgBytes, _ := json.Marshal(msg)
		ws.BroadcastToRoom(room, msgBytes)
	}
}
