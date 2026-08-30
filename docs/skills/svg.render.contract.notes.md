1.purpose:把已确定的Design Spec稳定渲染成SVG作品
2.Input:Design_spec
3.Out:draft.svg
4.Preconditions:
width>0
height>0
layout存在
content_blocks合法
5.Deterministic：需要提供可视化方案给用户查看（不太清楚是否）
6.不会修改用户数据，严格根据design_spec
7.layout不存在、width和height < 0
8.失败后应先返回查看design_spec,在retry
9.不需要 Human Approval
10.他绝对不负责：
不负责决定布局
不负责生成创意（这里表示一下：能生成图案这些，但是按照design_spec来生成，因此创意是在creative plan来生成创意想法供用户，svg render只负责生成）
不负责材料参数
不负责Preflight