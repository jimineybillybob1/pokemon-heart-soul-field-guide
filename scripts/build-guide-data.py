from __future__ import annotations

import ast
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
ASSET_DIR = ROOT / "assets"

METHOD_COLUMNS = [
    "Land",
    "Rock Smash / Headbutt",
    "Water (Surf)",
    "Old Rod",
    "Good Rod",
    "Super Rod",
]

TYPE_FIXES = {
    "Psyhcic": "Psychic",
}

SPECIES_ALIASES = {
    "Mr Mime": "Mr. Mime",
    "PorygonZ": "Porygon-Z",
}

SOURCE_URLS = {
    "officialSite": "https://pokemonheartsoul.com/",
    "sourceRepo": "https://github.com/PokemonHnS-Development/pokemonHnS",
    "pokecommunity": "https://www.pokecommunity.com/threads/heart-soul-completed-johto-gba-decomp-hack-v1-2-1-out-now.538287/",
    "steamGridDb": "https://www.steamgriddb.com/game/5503721/grids",
}


def compact(value):
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        value = value.replace("\r\n", "\n").strip()
        return value or None
    return value


def numeric_or_none(value):
    value = compact(value)
    if isinstance(value, (int, float)):
        return value
    return None


def clean_type(value):
    value = compact(value)
    return TYPE_FIXES.get(value, value)


def clean_species_name(value):
    value = compact(value)
    return SPECIES_ALIASES.get(value, value)


def split_lines(value):
    if value is None:
        return []
    return [line.strip() for line in str(value).replace("\r\n", "\n").splitlines() if line.strip()]


def split_semicolon(value):
    if value is None:
        return []
    return [part.strip() for part in str(value).split(";") if part.strip()]


def sheet_rows(ws, min_row=4):
    for row in ws.iter_rows(min_row=min_row, values_only=True):
        values = [compact(value) for value in row]
        if any(value is not None for value in values):
            yield values


def make_id(value):
    text = str(value).strip().lower()
    text = text.replace("&", "and")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def lookup_key(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def clean_game_text(value):
    text = str(value or "")
    replacements = {
        "POKÃ©MON": "Pokemon",
        "POKéMON": "Pokemon",
        "POKEMON": "Pokemon",
        "POKÃ©": "Poke",
        "POKé": "Poke",
        "POKe": "Poke",
        "DEFENSE": "Defense",
        "ATTACK": "Attack",
        "SP. ATK": "Sp. Atk",
        "SP. DEF": "Sp. Def",
        "SPEED": "Speed",
        "ACCURACY": "Accuracy",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"\{[^}]+\}", "", text)
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"(?<=\w)-\s+(?=\w)", "-", text)
    return text.strip()


def extract_c_string_literals(body):
    parts = []
    for token in re.findall(r'"(?:\\.|[^"\\])*"', body):
        try:
            parts.append(ast.literal_eval(token))
        except Exception:
            parts.append(token.strip('"').replace("\\n", "\n"))
    return clean_game_text("".join(parts))


def parse_description_symbols(path):
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8", errors="replace")
    descriptions = {}
    pattern = re.compile(r"static\s+const\s+u8\s+(s\w+)\[\]\s*=\s*_\(\s*((?:\s*\"(?:\\.|[^\"\\])*\"\s*)+)\);", re.S)
    for symbol, body in pattern.findall(text):
        descriptions[symbol] = extract_c_string_literals(body)
    return descriptions


def parse_move_descriptions(source_root):
    path = source_root / "src" / "data" / "text" / "move_descriptions.h"
    if not path.exists():
        return {}
    descriptions = parse_description_symbols(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    moves = {}
    for const_name, symbol in re.findall(r"\[(MOVE_[A-Z0-9_]+)\s*-\s*1\]\s*=\s*(s\w+)", text):
        description = descriptions.get(symbol)
        if not description:
            continue
        raw_name = const_name.removeprefix("MOVE_").replace("_", " ")
        moves[lookup_key(raw_name)] = description
    if "faintattack" in moves:
        moves["feintattack"] = moves["faintattack"]
    return moves


def parse_item_descriptions(source_root):
    text_path = source_root / "src" / "data" / "text" / "item_descriptions.h"
    items_path = source_root / "src" / "data" / "items.h"
    if not text_path.exists() or not items_path.exists():
        return {}
    descriptions = parse_description_symbols(text_path)
    text = items_path.read_text(encoding="utf-8", errors="replace")
    items = {}
    block_pattern = re.compile(r"\[(ITEM_[A-Z0-9_]+)\]\s*=\s*\{(.*?)\n\s*\},", re.S)
    for const_name, body in block_pattern.findall(text):
        name_match = re.search(r"\.name\s*=\s*_\(\"((?:\\.|[^\"])*)\"\)", body)
        desc_match = re.search(r"\.description\s*=\s*(s\w+)", body)
        if not desc_match:
            continue
        description = descriptions.get(desc_match.group(1))
        if not description or description == "?????":
            continue
        if name_match:
            items[lookup_key(clean_game_text(name_match.group(1)))] = description
        raw_name = const_name.removeprefix("ITEM_").replace("_", " ")
        items[lookup_key(raw_name)] = description
    return items


def sprite_slug(species_name):
    name = str(species_name).strip()
    lower = name.lower()
    form = None
    if lower.startswith("deoxys "):
        form = lower.split(" ", 1)[1]
        name = "Deoxys"

    replacements = {
        "\u2640": "_f",
        "\u2642": "_m",
        ".": "",
        "'": "",
        "\u2019": "",
        "-": "_",
        " ": "_",
    }
    slug = name.lower()
    for old, new in replacements.items():
        slug = slug.replace(old, new)
    slug = re.sub(r"[^a-z0-9_]", "", slug)
    slug = re.sub(r"_+", "_", slug).strip("_")
    if form:
        return slug, form
    return slug, None


def copy_first_existing(paths, destination):
    for path in paths:
        if path and path.exists():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, destination)
            return True
    return False


def copy_art(source_root):
    art_dir = ASSET_DIR / "art"
    art_dir.mkdir(parents=True, exist_ok=True)
    copied = {}
    art_map = {
        "logo": ("HnS_Logo.png", "heart-soul-logo.png"),
        "title": ("HnS_TitleScreen.png", "heart-soul-title.png"),
        "adventure": ("HnS_Collage_YourAdventure.png", "heart-soul-adventure.png"),
    }
    for key, (source_name, out_name) in art_map.items():
        source = source_root / source_name
        destination = art_dir / out_name
        if copy_first_existing([source], destination):
            copied[key] = str(destination.relative_to(ROOT)).replace("\\", "/")
    return copied


def copy_species_sprite(source_root, species_name):
    pokemon_root = source_root / "graphics" / "pokemon"
    slug, form = sprite_slug(species_name)
    base = pokemon_root / slug
    if form:
        base = base / form

    if not base.exists() and slug.startswith("nidoran"):
        base = pokemon_root / slug.replace("_female", "_f").replace("_male", "_m")
    if slug == "unown" and not (base / "front.png").exists():
        base = base / "a"

    candidates = [
        base / "front.png",
        base / "anim_front.png",
        base / "icon.png",
    ]
    out_name = f"{make_id(species_name)}.png"
    destination = ASSET_DIR / "pokemon" / out_name
    if copy_first_existing(candidates, destination):
        return str(destination.relative_to(ROOT)).replace("\\", "/")
    return None


def parse_level_moves(value):
    moves = []
    for line in split_lines(value):
        match = re.match(r"^Lv\.?\s*(\d+)\s+(.+)$", line, flags=re.I)
        if match:
            moves.append({"level": int(match.group(1)), "move": match.group(2).strip()})
        else:
            moves.append({"level": None, "move": line})
    return moves


def parse_encounter_line(line):
    match = re.match(r"^(.*?)\s+(?:\u2014|-)\s+(\d+(?:\.\d+)?)%\s+\(Lv\s*([^)]+)\)$", line.strip())
    if not match:
        return None
    species = match.group(1).strip()
    if species.lower() == "none":
        return None
    rate = float(match.group(2))
    if rate.is_integer():
        rate = int(rate)
    return {
        "species": species,
        "rate": rate,
        "level": re.sub(r"\s+", " ", match.group(3).strip()),
    }


def display_location(value):
    value = re.sub(r"\s+", " ", str(value).strip())
    value = re.sub(r"^Route(\d+)$", r"Route \1", value)
    return value


def parse_pokemon_cell(value):
    lines = split_lines(value)
    if not lines:
        return None
    mon = {
        "species": clean_species_name(lines[0]),
        "level": None,
        "item": None,
        "moves": [],
        "notes": [],
    }
    for line in lines[1:]:
        level_match = re.match(r"^Lv\.?\s*(\d+)", line, flags=re.I)
        item_match = re.match(r"^Item:\s*(.+)$", line, flags=re.I)
        move_match = re.match(r"^-\s*(.+)$", line)
        if level_match:
            mon["level"] = int(level_match.group(1))
        elif item_match:
            item = item_match.group(1).strip()
            mon["item"] = None if item.lower() == "none" else item
        elif move_match:
            mon["moves"].append(move_match.group(1).strip())
        else:
            mon["notes"].append(line)
    return mon


def build_species(wb, source_root):
    ws = wb["Species Info"]
    species = []
    by_name = {}
    for row in sheet_rows(ws):
        name = row[0]
        if not name:
            continue
        type1 = clean_type(row[9])
        type2 = clean_type(row[10])
        types = [type1] if type1 == type2 or not type2 else [type1, type2]
        stat_values = [numeric_or_none(value) or 0 for value in row[3:9]]
        bst = numeric_or_none(row[2]) or sum(stat_values)
        abilities = []
        for ability in [row[26], row[27], row[28]]:
            if ability and ability not in abilities:
                abilities.append(ability)
        item_common = row[19]
        item_rare = row[20]
        entry = {
            "id": make_id(name),
            "name": name,
            "dex": row[1],
            "bst": bst,
            "stats": {
                "hp": row[3],
                "atk": row[4],
                "def": row[5],
                "spa": row[6],
                "spd": row[7],
                "spe": row[8],
            },
            "types": types,
            "catchRate": row[11],
            "expYield": row[12],
            "evYield": {
                "hp": row[13],
                "atk": row[14],
                "def": row[15],
                "spe": row[16],
                "spa": row[17],
                "spd": row[18],
            },
            "heldItems": {
                "common": item_common,
                "rare": item_rare,
            },
            "gender": row[21],
            "eggCycles": row[22],
            "growthRate": row[23],
            "eggGroups": [group for group in [row[24], row[25]] if group],
            "abilities": abilities,
            "bodyColor": row[30],
            "noFlip": row[31],
            "sprite": copy_species_sprite(source_root, name),
            "wildLocations": [],
            "staticLocations": [],
            "evolutions": [],
            "evolvesFrom": [],
            "learnsets": {"level": [], "tmhm": [], "tutor": [], "egg": []},
        }
        species.append(entry)
        by_name[name] = entry
    return species, by_name


def build_locations(wb, species_by_name):
    ws = wb["Wild Encounters"]
    locations = []
    by_name = {}
    species_locations = {}
    for row in sheet_rows(ws):
        raw_location = row[0]
        time = row[1]
        if not raw_location or not time:
            continue
        name = display_location(raw_location)
        location = by_name.get(name)
        if not location:
            location = {"id": make_id(name), "name": name, "rows": []}
            by_name[name] = location
            locations.append(location)
        methods = {}
        for method_name, cell in zip(METHOD_COLUMNS, row[2:8]):
            encounters = []
            for line in split_lines(cell):
                parsed = parse_encounter_line(line)
                if parsed:
                    encounters.append(parsed)
                    species_locations.setdefault(parsed["species"], set()).add(name)
            if encounters:
                methods[method_name] = encounters
        if methods:
            location["rows"].append({"time": time, "methods": methods})

    for name, location_names in species_locations.items():
        if name in species_by_name:
            species_by_name[name]["wildLocations"] = sorted(location_names)
    for location in locations:
        seen = set()
        for row in location["rows"]:
            for encounters in row["methods"].values():
                seen.update(encounter["species"] for encounter in encounters)
        location["speciesCount"] = len(seen)
    return locations


def build_static(wb, species_by_name):
    ws = wb["Static, Gift, Trade Pokemon"]
    rows = []
    for row in sheet_rows(ws):
        species_name = row[2]
        entry = {
            "category": row[0],
            "subcategory": row[1],
            "species": species_name,
            "level": row[3],
            "tradeFor": row[4],
            "nickname": row[5],
            "location": display_location(row[6]) if row[6] else None,
            "shinyLocked": row[7],
            "resetMethod": row[8],
            "notes": row[9],
            "oddEggCodes": row[10],
        }
        rows.append(entry)
        if species_name in species_by_name and entry["location"]:
            species_by_name[species_name]["staticLocations"].append(entry["location"])
    for entry in species_by_name.values():
        entry["staticLocations"] = sorted(set(entry["staticLocations"]))
    return rows


def build_items(wb, item_descriptions, move_descriptions):
    ws = wb["Items, TMs, HMs"]
    items = []
    for row in sheet_rows(ws):
        if row[1] == "GLOBAL_NOTE":
            continue
        if not row[0]:
            continue
        item_name = row[0]
        machine_code = str(item_name).split()[0] if re.match(r"^(?:TM|HM)\d+", str(item_name), flags=re.I) else ""
        move_name = row[2]
        description = (
            item_descriptions.get(lookup_key(item_name))
            or item_descriptions.get(lookup_key(machine_code))
            or None
        )
        if move_name and not description:
            move_description = move_descriptions.get(lookup_key(move_name))
            description = clean_game_text(f"Teaches {move_name}. {move_description}" if move_description else f"Teaches {move_name}.")
        items.append(
            {
                "id": make_id(item_name),
                "name": item_name,
                "type": row[1],
                "move": move_name,
                "locations": row[3],
                "wildCommonSpecies": split_semicolon(row[4]),
                "wildRareSpecies": split_semicolon(row[5]),
                "notes": row[6],
                "description": description,
            }
        )
    return items


def build_evolutions_and_breeding(wb, species_by_name):
    ws = wb["Evolutions, Breeding"]
    evolutions = []
    breeding = []
    for row in sheet_rows(ws):
        if row[0] and row[1]:
            evo = {
                "from": row[0],
                "to": row[1],
                "method": row[2],
                "requirement": row[3],
                "conditions": row[4],
            }
            evolutions.append(evo)
            if row[0] in species_by_name:
                species_by_name[row[0]]["evolutions"].append(evo)
            if row[1] in species_by_name:
                species_by_name[row[1]]["evolvesFrom"].append(evo)
        if row[6] and row[7]:
            breeding.append(
                {
                    "baby": row[6],
                    "parents": row[7],
                    "requirement": row[8],
                    "notes": row[9],
                }
            )
    return evolutions, breeding


def build_learnsets(wb, species_by_name):
    ws = wb["Learnsets"]
    learnsets = []
    for row in sheet_rows(ws):
        name = row[0]
        if not name:
            continue
        entry = {
            "species": name,
            "level": parse_level_moves(row[1]),
            "tmhm": split_lines(row[2]),
            "tutor": split_lines(row[3]),
            "egg": split_lines(row[4]),
        }
        learnsets.append(entry)
        if name in species_by_name:
            species_by_name[name]["learnsets"] = {
                "level": entry["level"],
                "tmhm": entry["tmhm"],
                "tutor": entry["tutor"],
                "egg": entry["egg"],
            }
    return learnsets


def build_moves(wb, move_descriptions):
    ws = wb["Moves"]
    moves = []
    for row in sheet_rows(ws):
        if not row[0] or row[0] == "None":
            continue
        moves.append(
            {
                "id": make_id(row[0]),
                "name": row[0],
                "effect": row[1],
                "power": row[2],
                "type": clean_type(row[3]),
                "accuracy": row[4],
                "pp": row[5],
                "secondaryEffectChance": row[6],
                "target": row[7],
                "priority": row[8],
                "category": row[9],
                "flags": row[10],
                "description": move_descriptions.get(lookup_key(row[0])),
            }
        )
    return moves


def build_trainers(wb):
    ws = wb["Trainer Teams"]
    trainers = []
    for row in sheet_rows(ws):
        if not row[0] or not row[1]:
            continue
        team = [parse_pokemon_cell(value) for value in row[2:8]]
        trainers.append(
            {
                "id": make_id(f"{row[0]} {row[1]}"),
                "category": row[0],
                "name": row[1],
                "team": [mon for mon in team if mon],
            }
        )
    return trainers


def build_simple_table(wb, sheet_name, headers, min_row=4):
    ws = wb[sheet_name]
    rows = []
    for row in sheet_rows(ws, min_row=min_row):
        entry = {}
        for index, key in enumerate(headers):
            entry[key] = row[index] if index < len(row) else None
        rows.append(entry)
    return rows


def build_data(workbook_path, source_root):
    wb = openpyxl.load_workbook(workbook_path, read_only=False, data_only=False)
    art = copy_art(source_root)
    move_descriptions = parse_move_descriptions(source_root)
    item_descriptions = parse_item_descriptions(source_root)
    species, species_by_name = build_species(wb, source_root)
    locations = build_locations(wb, species_by_name)
    static_pokemon = build_static(wb, species_by_name)
    evolutions, breeding = build_evolutions_and_breeding(wb, species_by_name)
    learnsets = build_learnsets(wb, species_by_name)
    moves = build_moves(wb, move_descriptions)
    data = {
        "meta": {
            "title": "Pokemon Heart & Soul Field Guide",
            "version": "1.0",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "workbook": Path(workbook_path).name,
            "counts": {},
        },
        "sources": SOURCE_URLS,
        "art": art,
        "species": species,
        "locations": locations,
        "staticPokemon": static_pokemon,
        "items": build_items(wb, item_descriptions, move_descriptions),
        "evolutions": evolutions,
        "breeding": breeding,
        "learnsets": learnsets,
        "moves": moves,
        "tutors": build_simple_table(wb, "Move Tutors", ["move", "location", "cost"]),
        "berries": build_simple_table(wb, "Berries", ["berry", "function", "location", "ball", "ballEffectiveness"]),
        "trainers": build_trainers(wb),
        "faq": build_simple_table(wb, "FAQ", ["type", "question", "answer", "detail"]),
        "completion": build_simple_table(wb, "Completion Requirements", ["category", "subcategory", "requirement"]),
        "rematches": build_simple_table(wb, "Gym Leader Rematches", ["leader", "location", "when"]),
        "credits": build_simple_table(wb, "Credits", ["role", "names"]),
    }
    data["meta"]["counts"] = {
        "species": len(data["species"]),
        "locations": len(data["locations"]),
        "staticPokemon": len(data["staticPokemon"]),
        "items": len(data["items"]),
        "moves": len(data["moves"]),
        "trainers": len(data["trainers"]),
    }
    return data


def main():
    if len(sys.argv) < 2:
        print("Usage: build-guide-data.py <workbook.xlsx> [source-repo-dir]", file=sys.stderr)
        return 2
    workbook_path = Path(sys.argv[1]).resolve()
    source_root = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT / "work" / "pokemonHnS"
    if not workbook_path.exists():
        raise FileNotFoundError(workbook_path)
    if not source_root.exists():
        raise FileNotFoundError(source_root)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data = build_data(workbook_path, source_root)
    out_path = DATA_DIR / "heart-soul-data.js"
    payload = json.dumps(data, ensure_ascii=True, separators=(",", ":"))
    out_path.write_text(f"window.HEART_SOUL_DATA={payload};\n", encoding="utf-8")
    print(f"Wrote {out_path.relative_to(ROOT)}")
    print(json.dumps(data["meta"]["counts"], indent=2))


if __name__ == "__main__":
    raise SystemExit(main())
