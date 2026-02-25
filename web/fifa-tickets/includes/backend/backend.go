package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	// "fmt"
	"log"
	"net"
	"strconv"
	"time"
	"os"
	"strings"
	
	"github.com/go-redis/redis/v8" 
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"

	pb "fifa-chal/backend/gen"
)

const (
	hmacSHA256Secret = "portuguenese"
	flag       = "p_ctf{whO_kNeW_sMuGGl!nG_W@$_E@sY}"
)

// --- Global State ---
var (
	rdb *redis.Client
	rowToZone = map[string]pb.SeatZone{
		"A": pb.SeatZone_VIP, "B": pb.SeatZone_VIP,
		"C": pb.SeatZone_PREMIUM, "D": pb.SeatZone_PREMIUM,
		"E": pb.SeatZone_PRO, "F": pb.SeatZone_PRO,
		"G": pb.SeatZone_REGULAR, "H": pb.SeatZone_REGULAR,
	}
)

type seatServer struct {
	pb.UnimplementedSeatServiceServer
}

func hmacHash(raw string) string {
	h := hmac.New(sha256.New, []byte(hmacSHA256Secret))
	h.Write([]byte(raw))
	return hex.EncodeToString(h.Sum(nil))
}

func validateSession(token string) error {
	ctx := context.Background()

	val, err := rdb.Get(ctx, token).Result()
	if err == redis.Nil {
		return status.Error(codes.Unauthenticated, "Invalid or missing session token")
	} else if err != nil {
		return status.Error(codes.Internal, "Session database error")
	}

	ts, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		return status.Error(codes.Internal, "Corrupted session data")
	}

	if time.Since(time.Unix(ts, 0)) > 10*time.Minute {
		rdb.Del(ctx, token)
		return status.Error(codes.Unauthenticated, "Session expired. Please refresh the page.")
	}

	return nil
}

func resolveSeatFromHash(inputHash string) (string, pb.SeatZone, bool) {
	for row, zone := range rowToZone {
		for i := 1; i <= 10; i++ {
			seatName := row + strconv.Itoa(i) 
			expectedHash := hmacHash(seatName)
			if hmac.Equal([]byte(expectedHash), []byte(inputHash)) {
				return seatName, zone, true
			}
		}
	}
	return "", pb.SeatZone_INVALID, false
}


func (s *seatServer) ListSeats(ctx context.Context, req *pb.SeatRowRequest) (*pb.SeatRowResponse, error) {
	// header := metadata.Pairs("hmac-key", hmacSHA256Secret)
	// grpc.SendHeader(ctx, header)
	return &pb.SeatRowResponse{}, nil
}

func (s *seatServer) ReserveSeat(ctx context.Context, req *pb.ReserveSeatRequest) (*pb.ReserveSeatResponse, error) {
    if len(req.Request) == 0 {
        return nil, status.Error(codes.InvalidArgument, "Invalid request.")
    }
    
    if len(req.Request) > 1024 { // 1KB limit for payload
        return nil, status.Error(codes.InvalidArgument, "Request payload too large.")
    }
    var seatData pb.ReserveSeatData
    if err := proto.Unmarshal(req.Request, &seatData); err != nil {
        return nil, status.Error(codes.InvalidArgument, "Invalid protobuf request.")
    }

    if err := validateSession(seatData.SessionToken); err != nil {
        return nil, err
    }
    
    seatName, actualZone, found := resolveSeatFromHash(seatData.Hash)
    if !found {
        return nil, status.Error(codes.InvalidArgument, "Invalid seat choice")
    }
    seatName = seatName
    
    if seatData.Zone != actualZone {
        return nil, status.Errorf(codes.PermissionDenied, "Zone mismatch.")
    }
    
    // Check if VIP
    if actualZone == pb.SeatZone_VIP {
        ticket := &pb.ConfirmedTicket{
            Flag: flag,
        }
        data, err := proto.Marshal(ticket)
        if err != nil {
            return nil, status.Error(codes.Internal, "Ticket generation failed")
        }
        return &pb.ReserveSeatResponse{
            Success:    true,
            Message:    "VIP Access Granted. Ticket attached.",
            TicketData: data, 
        }, nil
    }
    
    return nil, status.Error(codes.PermissionDenied, "Only VIP seats can be reserved via this priority API.")
}
func blockGrpcurlInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    blacklist := []string{
        "grpcurl",
        "burp",
        "burpsuite",
        "postman",
        "insomnia",
        "httpie",
        "curl",
        "wget",
        "python-requests",
        "axios",
        "fetch",
        "node-fetch",
        "got",
        "restclient",
        "paw",
        "advanced rest client",
        "talend",
        "soapui",
        "jmeter",
        "fiddler",
        "charles",
        "mitmproxy",
        "grpc-gateway",
        "grpcwebproxy",
        "envoy",
    }
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return nil, status.Error(codes.InvalidArgument, "Missing metadata")
    }
    if userAgents := md["user-agent"]; len(userAgents) > 0 {
        for _, ua := range userAgents {
            uaLower := strings.ToLower(ua)
            
            for _, blockedTool := range blacklist {
                if strings.Contains(uaLower, blockedTool) {
                    log.Printf("[Block] Blocked request from tool: %s (UA: %s)", blockedTool, ua)
                    return nil, status.Error(codes.PermissionDenied, "Unauthorized client")
                }
            }
        }
    }

    return handler(ctx, req)
}

func main() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
	    redisAddr = "localhost:6379"
	}

	backendPort := os.Getenv("BACKEND_PORT")
	if backendPort == "" {
		backendPort = ":50051"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	lis, err := net.Listen("tcp", backendPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer(
    	grpc.UnaryInterceptor(blockGrpcurlInterceptor),
     	grpc.MaxRecvMsgSize(1024*1024), 
	)
	pb.RegisterSeatServiceServer(s, &seatServer{})
	reflection.Register(s)

	log.Printf("Backend gRPC server listening on : %v", backendPort)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
