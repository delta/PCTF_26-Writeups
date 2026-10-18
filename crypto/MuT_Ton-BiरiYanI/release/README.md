# MuT_Ton-BiरiYanI (V20: The Lattice Edition)

## 🍛 Challenge Description
Help the foodie to order mutton biryani. 
Mutton Biryani costs ₹200.but :_] ...

The system is now running in a hardened, jailed environment.
Gather the calibration data, recover the state, and acquire the flag.

## 🏗️ Structure
- `challenge.py`: The core service logic.
- `requirements.txt`: Python dependencies.
- `Dockerfile`: Jailed container configuration for local testing.

## 🚀 Deployment (Jailed)
To recreate the production environment locally:
```bash
docker build -t biriyani-jail .
docker run -d --privileged -p 9294:5000 --name biriyani-jail biriyani-jail
nc localhost 9294
```
*(Note: `--privileged` is required for the redpwn jail to manage cgroups and namespaces inside Docker.)*

## 💡 Hints
- The `QUERY` command leaks calibration data at 150-precision.
- The Kitchen is more optimistic than the Counter.
- The flag is stored in `flag.txt` inside the jail.
