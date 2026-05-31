with open(r"d:\Pixels2Play\FrontEnd\src\screens\ChildLearnPage\ChildLearnPage.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = lines[:417]
for line in lines[812:]:
    if line.startswith("  "):
        new_lines.append(line[2:])
    else:
        new_lines.append(line)

with open(r"d:\Pixels2Play\FrontEnd\src\screens\ChildLearnPage\ChildLearnPage.jsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
