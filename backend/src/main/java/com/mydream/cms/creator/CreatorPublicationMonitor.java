package com.mydream.cms.creator;

import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ConnectionCallback;

@Component
@EnableScheduling
@ConditionalOnProperty(name="creator.publication-monitor.enabled",havingValue="true",matchIfMissing=true)
public class CreatorPublicationMonitor {
 private final JdbcTemplate jdbc;private final CreatorEpisodeService episodes;
 private final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(getClass());
 public CreatorPublicationMonitor(JdbcTemplate jdbc,CreatorEpisodeService episodes){this.jdbc=jdbc;this.episodes=episodes;}
 @Scheduled(initialDelayString="${creator.publication-monitor.initial-delay-ms:60000}",fixedDelayString="${creator.publication-monitor.delay-ms:60000}")
 public void scan(){
  // Connection-scoped lock prevents duplicate scanners across CMS instances.
  jdbc.execute((ConnectionCallback<Void>) connection->{
   try(var statement=connection.createStatement();var lock=statement.executeQuery("SELECT GET_LOCK('cms_creator_publication_monitor',0)")){
    if(!lock.next()||lock.getInt(1)!=1)return null;
   }
   try{
    var rows=jdbc.queryForList("""
     SELECT p.script_id,p.episode_number FROM cms_creator_episode_publication p
     LEFT JOIN (SELECT script_id,episode_number,MAX(checked_at) checked_at FROM cms_creator_publication_check GROUP BY script_id,episode_number) c
     ON c.script_id=p.script_id AND c.episode_number=p.episode_number
     WHERE c.checked_at IS NULL OR c.checked_at<DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 5 MINUTE)
     ORDER BY COALESCE(c.checked_at,'1970-01-01'),p.script_id,p.episode_number LIMIT 10
     """);
    for(var row:rows)try{episodes.check(new CreatorAccess.Viewer("system:publication-monitor","系統核對",true),row.get("script_id").toString(),true,((Number)row.get("episode_number")).intValue());}
    catch(Exception e){log.warn("Publication monitor check failed for {} episode {}",row.get("script_id"),row.get("episode_number"),e);}
   }finally{try(var statement=connection.createStatement()){statement.execute("SELECT RELEASE_LOCK('cms_creator_publication_monitor')");}}
   return null;
  });
 }
}
