# Phasor Lab

用于 Power System Fundamentals 英文授课的静态实验网页。在浏览器打开 `index.html` 即可离线使用。所有相量均为 RMS 值，采用 ABC 正相序。

## 发布到 GitHub Pages

1. 把此目录中的文件上传到仓库根目录，使 `index.html` 位于根目录。
2. 打开仓库的 **Settings → Pages**，在 **Source** 选择 **Deploy from a branch**。
3. 选择文件所在分支和 **/(root)**，点击 **Save**。发布完成后，Pages 设置页会显示网址。

也可以将同一组文件放入仓库的 `docs/` 目录，并将发布目录选为 **/docs**。[GitHub Pages 发布设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 三个面板

- **Sequence components** · 拖动 A、B、C 相的相量尖端，或编辑幅值、相角。三个小图分别显示正序、负序、零序的三相向量。选择 **Shared** 可以在相同量程下比较幅值。
- **Three-phase load** · 四线制星形电源经每相 0.04 + j0.08 pu 的线路阻抗向星形恒功率负载供电。中性线理想。选择 A、B 或 C 后可以独立调整该相电源和负载。展开 **Phasor readings** 查看电压和电流的精确读数。
- **Fault networks** · 切换单相接地、两相短路、两相接地或三相短路，比较故障连接、序网及故障点电压和电流。默认电源为 1∠0° pu，正、负、零序阻抗分别为 j0.20、j0.20、j0.15 pu。

教学依据为 University of Bath EE32013 的 *Block 2 – Unbalanced Networks* 和 *Block 3 – Fault Calculations*。
