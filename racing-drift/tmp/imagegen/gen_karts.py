import os
import sys
from pathlib import Path

try:
    from google import genai
except ImportError:
    print("Please install google-genai", file=sys.stderr)
    sys.exit(1)

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)
        
    client = genai.Client()
    out_dir = Path("output/imagegen")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    karts = [
        ("cotton_kart", "Voxel art style 3D racing kart from KartRider, hybrid casual style, soft pink and white color scheme, smooth lighting, isolated on solid white background, game asset, isometric view."),
        ("burst_kart", "Voxel art style 3D racing kart from KartRider, hybrid casual style, sharp yellow and black color scheme with aggressive angles, smooth lighting, isolated on solid white background, game asset, isometric view."),
        ("solid_kart", "Voxel art style 3D racing kart from KartRider, hybrid casual style, blocky and heavy blue and silver color scheme, smooth lighting, isolated on solid white background, game asset, isometric view."),
        ("marathon_kart", "Voxel art style 3D racing kart from KartRider, hybrid casual style, streamlined red and orange color scheme, smooth lighting, swept back design, isolated on solid white background, game asset, isometric view."),
        ("saber_kart", "Voxel art style 3D racing kart from KartRider, hybrid casual style, sleek neon cyan and black color scheme, sharp aerodynamic design, smooth lighting, isolated on solid white background, game asset, isometric view.")
    ]
    
    for name, prompt in karts:
        print(f"Generating {name}...")
        try:
            response = client.models.generate_content(
                model='gemini-3-pro-image-preview',
                contents=prompt
            )
            saved = False
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    file_path = out_dir / f"{name}.jpg"
                    with open(file_path, "wb") as f:
                        f.write(part.inline_data.data)
                    print(f"Saved to {file_path}")
                    saved = True
                    break
            if not saved:
                print(f"No image returned for {name}", file=sys.stderr)
        except Exception as e:
            print(f"Error generating {name}: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
