        bangumiSection.dataItem.setPropertyPath("bangumi", result.episodes.map((av) => {
            let objectItem = new DataItem('bangumi', av.av_id);
            objectItem.cover = av.cover;
            objectItem.title = av.index_title;
            objectItem.description = `第${av.index}话`;
            if(av.is_new){
                objectItem.description = `NEW 第${av.index}话`;
            }
            objectItem.onselect = function (e) {
                playBangumi(sid, av, getQualityApiValue(getUserSettings("Video_Quality")));
            };
            return objectItem;
        }));