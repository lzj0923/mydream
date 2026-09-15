package com.mydream.cms.creator;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
@Service
public class CreatorWorkTypeService {
 private final JdbcTemplate jdbc;private final CreatorTeamService teams;
 public CreatorWorkTypeService(JdbcTemplate j,CreatorTeamService t){jdbc=j;teams=t;}
 public CreatorWorkType current(String actor){
  var rows=jdbc.queryForList("SELECT work_type FROM cms_creator_work_context WHERE account_id=?",String.class,actor);
  var type=rows.isEmpty()?CreatorWorkType.COMIC:CreatorWorkType.parse(rows.get(0));
  var scope=teams.scope(actor);if(scope.member()){var allowed=jdbc.queryForObject("SELECT work_types FROM cms_creator_team_member WHERE company_owner=? AND account_id=? AND state='ACTIVE'",String.class,scope.owner(),actor);if(allowed==null||allowed.isBlank())throw CreatorTeamService.denied();if(!Arrays.asList(allowed.split(",")).contains(type.name()))type=CreatorWorkType.parse(allowed.split(",")[0]);}return type;
 }
 private void require(String actor,CreatorWorkType type){var scope=teams.scope(actor);if(!scope.member())return;
  var allowed=jdbc.queryForObject("SELECT work_types FROM cms_creator_team_member WHERE company_owner=? AND account_id=? AND state='ACTIVE'",String.class,scope.owner(),actor);
  if(allowed==null||!Arrays.asList(allowed.split(",")).contains(type.name()))throw CreatorTeamService.denied();
 }
 @Transactional public Object select(String actor,String value){var type=CreatorWorkType.parse(value);require(actor,type);jdbc.update("INSERT INTO cms_creator_work_context(account_id,work_type) VALUES (?,?) ON DUPLICATE KEY UPDATE work_type=VALUES(work_type)",actor,type.name());return status(actor);}
 public Object status(String actor){var scope=teams.scope(actor);return Map.of("workType",current(actor).name(),"label",current(actor).label,"unclassifiedCount",jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_script WHERE owner_key=? AND work_type='UNCLASSIFIED'",Integer.class,"creator:"+scope.owner()));}
}
