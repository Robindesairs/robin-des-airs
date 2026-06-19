#!/usr/bin/env python3
"""Injecte 2 sections UNIQUES et factuelles dans les pages-villes les plus templatées,
pour les différencier (SEO : sortir de « Explorée, non indexée »).
Contenu = climat/saison de retard réel + corridor diaspora + exemple NON daté (jamais de n° de vol inventé).
Édition directe du HTML : ces pages n'ont pas de .md (build:blog ne les régénère pas).
Anti-bavure : saute toute page ayant un .md source ; insère avant le bloc générique « Famille »."""
import re, glob
from pathlib import Path

BLOG = Path("blog")
SRC = Path("src/content/blog")

# Par ville : (Titre ville, Pays, phrase CLIMAT/saison de retard RÉELLE, phrase CORRIDOR diaspora/routing).
# Tout est vérifiable (géographie/climat/démographie) ; aucun n° de vol ni retard daté.
CITIES = {
 "freetown": ("Freetown","Sierra Leone",
   "L'aéroport de Lungi est séparé de Freetown par l'estuaire : la correspondance par bateau ou hovercraft ajoute ses propres aléas. La saison des pluies (mai–octobre) est parmi les plus intenses de la côte ouest-africaine — orages et faible visibilité — tandis que l'Harmattan (décembre–février) charge l'air de poussière sèche venue du Sahara.",
   "La diaspora sierra-léonaise est surtout implantée au Royaume-Uni et en Belgique ; depuis la France, le trajet se fait presque toujours avec une escale, ce qui multiplie les points où un retard peut naître."),
 "luanda": ("Luanda","Angola",
   "La saison des pluies s'étend de septembre à avril, avec des orages tropicaux en fin d'après-midi ; l'intense trafic pétrolier sature régulièrement l'aéroport 4 de Fevereiro.",
   "La diaspora angolaise est historiquement liée au Portugal ; depuis Paris, Luanda se rejoint généralement via un hub européen ou est-africain."),
 "abuja": ("Abuja","Nigeria",
   "L'Harmattan (décembre–février) fait chuter la visibilité et provoque déroutements et retards récurrents à Abuja comme à Lagos ; la saison des pluies (avril–octobre) apporte des orages violents.",
   "Capitale fédérale, Abuja concentre un trafic d'affaires et institutionnel ; la diaspora nigériane, l'une des plus nombreuses au monde, est surtout présente au Royaume-Uni et aux États-Unis."),
 "kigali": ("Kigali","Rwanda",
   "Le Rwanda connaît deux saisons des pluies (mars–mai et octobre–décembre) avec des orages d'altitude ; l'aéroport de Kigali, en hauteur, est sujet aux brouillards matinaux.",
   "Les liens historiques avec la Belgique et la France sont forts ; depuis Paris, Kigali se rejoint souvent via Bruxelles ou un hub d'Afrique de l'Est."),
 "nairobi": ("Nairobi","Kenya",
   "Les « long rains » (mars–mai) et « short rains » (octobre–décembre), combinés à l'altitude de Nairobi (1 600 m) et aux orages d'après-midi, pèsent sur la ponctualité.",
   "Grand hub d'Afrique de l'Est très connecté, Nairobi mêle un trafic d'affaires et de safari ; la diaspora kényane est surtout établie au Royaume-Uni."),
 "bujumbura": ("Bujumbura","Burundi",
   "La saison des pluies (octobre–mai) sur le lac Tanganyika apporte orages et faible visibilité ; la desserte aérienne limitée laisse peu d'alternatives en cas de vol manqué.",
   "La diaspora burundaise est implantée en Belgique et en France ; depuis Paris, Bujumbura se rejoint via un hub belge ou est-africain."),
 "kampala": ("Kampala","Ouganda",
   "L'aéroport d'Entebbe, au bord du lac Victoria, est exposé à des orages quasi quotidiens pendant les saisons des pluies (mars–mai et octobre–novembre).",
   "La diaspora ougandaise est surtout au Royaume-Uni ; depuis Paris, Entebbe se rejoint via un hub d'Afrique de l'Est, du Golfe ou d'Europe."),
 "brazzaville": ("Brazzaville","Congo",
   "Le climat équatorial donne deux saisons des pluies (octobre–décembre et mars–mai) et des brouillards de saison sèche (juin–septembre) sur le fleuve Congo.",
   "Les liens avec la France sont étroits et le trafic familial important ; Brazzaville fait face à Kinshasa, sur l'autre rive du fleuve."),
 "yaounde": ("Yaoundé","Cameroun",
   "Le climat équatorial très pluvieux (deux maxima, avril–juin et septembre–novembre) expose l'aéroport de Yaoundé-Nsimalen aux orages et aux plafonds bas.",
   "La communauté camerounaise en France est nombreuse ; Yaoundé et Douala sont les deux portes du pays, desservies par plusieurs compagnies européennes."),
 "johannesburg": ("Johannesburg","Afrique du Sud",
   "Les orages d'été du Highveld (novembre–février), souvent violents en fin d'après-midi, et les brouillards matinaux d'hiver affectent OR Tambo, l'un des plus grands hubs du continent.",
   "Le trafic d'affaires et touristique domine ce corridor ; Paris–Johannesburg est un très long-courrier de plus de 8 700 km, souvent opéré en direct."),
 "antananarivo": ("Antananarivo","Madagascar",
   "La saison cyclonique de novembre à avril provoque annulations et reports : les cyclones de l'océan Indien et la saison des pluies sur les Hautes Terres sont des facteurs majeurs.",
   "Madagascar entretient des liens très forts avec la France ; Paris–Antananarivo est un long-courrier de près de 8 800 km, parfois opéré via La Réunion."),
 "ouagadougou": ("Ouagadougou","Burkina Faso",
   "L'Harmattan (novembre–février) apporte poussière sahélienne et visibilité réduite ; la brève mais intense saison des pluies (juin–septembre) s'accompagne d'orages.",
   "Les liens avec la France et la Côte d'Ivoire sont étroits ; depuis Paris, Ouagadougou se rejoint en direct ou via un hub ouest-africain ou maghrébin."),
 "djibouti": ("Djibouti","Djibouti",
   "La chaleur extrême de l'été (souvent plus de 45 °C) peut limiter les charges au décollage, et les vents de sable réduisent périodiquement la visibilité.",
   "Djibouti garde des liens étroits avec la France (présence militaire et diaspora) ; carrefour de la Corne de l'Afrique, il est souvent rejoint via un hub du Golfe ou d'Éthiopie."),
 "accra": ("Accra","Ghana",
   "L'Harmattan (décembre–février) charge l'air de poussière, et les deux saisons des pluies (avril–juin et septembre–octobre) apportent des orages sur la côte.",
   "La diaspora ghanéenne est surtout au Royaume-Uni et aux États-Unis ; Accra est un hub régional desservi par de nombreuses compagnies européennes et non-européennes."),
 "cotonou": ("Cotonou","Bénin",
   "Le littoral connaît deux saisons des pluies (avril–juillet et septembre–octobre) et un épisode d'Harmattan en décembre–janvier.",
   "Les liens avec la France sont forts ; Cotonou est souvent desservi en « milk-run » (escale à Lomé, Abidjan ou Niamey), ce qui multiplie les sources possibles de retard."),
}

def block(city, country, climate, corridor):
    ex = (f"Exemple : un Paris&nbsp;&rarr;&nbsp;{city} arrivé à destination avec 4&nbsp;h de retard ouvre droit à "
          f"600&nbsp;&euro; par passager — soit jusqu'à 2&nbsp;400&nbsp;&euro; pour une famille de quatre.")
    return (
        f"\n<h2>Pourquoi un vol Paris &rarr; {city} peut être retardé</h2>\n"
        f"<p>{climate}</p>\n"
        f"<h2>Le corridor {country}&ndash;France en pratique</h2>\n"
        f"<p>{corridor} {ex}</p>\n"
    )

fam_re = re.compile(r'(<h2[^>]*>\s*(?:Famille\s*:\s*(?:la\s+)?multiplication|Prescription\s*:\s*5\s*ans))', re.I)
done, skipped = [], []
for slug,(city,country,climate,corridor) in CITIES.items():
    f = BLOG / f"vol-retarde-{slug}-paris-indemnite.html"
    if not f.exists(): skipped.append((slug,"html absent")); continue
    if (SRC / f"vol-retarde-{slug}-paris-indemnite.md").exists(): skipped.append((slug,".md présent → édite le .md")); continue
    html = f.read_text(encoding="utf-8")
    if "Pourquoi un vol Paris" in html: skipped.append((slug,"déjà enrichi")); continue
    m = fam_re.search(html)
    if not m: skipped.append((slug,"ancre Famille introuvable")); continue
    html = html[:m.start()] + block(city,country,climate,corridor) + html[m.start():]
    f.write_text(html, encoding="utf-8")
    done.append(slug)

print("ENRICHIES :", len(done)); [print("  +",s) for s in done]
print("SAUTÉES :", len(skipped)); [print("  -",s,r) for s,r in skipped]
