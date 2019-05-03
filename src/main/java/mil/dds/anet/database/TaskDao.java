package mil.dds.anet.database;

import io.leangen.graphql.annotations.GraphQLRootContext;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import mil.dds.anet.AnetObjectEngine;
import mil.dds.anet.beans.Person;
import mil.dds.anet.beans.Position;
import mil.dds.anet.beans.Report;
import mil.dds.anet.beans.Task;
import mil.dds.anet.beans.Task.TaskStatus;
import mil.dds.anet.beans.lists.AnetBeanList;
import mil.dds.anet.beans.search.TaskSearchQuery;
import mil.dds.anet.database.mappers.PositionMapper;
import mil.dds.anet.database.mappers.ReportMapper;
import mil.dds.anet.database.mappers.TaskMapper;
import mil.dds.anet.utils.DaoUtils;
import mil.dds.anet.views.ForeignKeyFetcher;
import org.jdbi.v3.core.statement.Query;
import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.customizer.BindBean;
import org.jdbi.v3.sqlobject.statement.SqlBatch;
import ru.vyarus.guicey.jdbi3.tx.InTransaction;

@InTransaction
public class TaskDao extends AnetBaseDao<Task> {

  public TaskDao() {
    super("Tasks", "tasks", "*", null);
  }

  public AnetBeanList<Task> getAll(int pageNum, int pageSize) {
    String sql;
    if (DaoUtils.isMsSql()) {
      sql = "/* getAllTasks */ SELECT tasks.*, COUNT(*) OVER() AS totalCount "
          + "FROM tasks ORDER BY \"createdAt\" ASC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY";
    } else {
      sql =
          "/* getAllTasks */ SELECT * from tasks ORDER BY \"createdAt\" ASC LIMIT :limit OFFSET :offset";
    }
    final Query query =
        getDbHandle().createQuery(sql).bind("limit", pageSize).bind("offset", pageSize * pageNum);
    return new AnetBeanList<Task>(query, pageNum, pageSize, new TaskMapper(), null);
  }

  public Task getByUuid(String uuid) {
    return getByIds(Arrays.asList(uuid)).get(0);
  }

  static class SelfIdBatcher extends IdBatcher<Task> {
    private static final String sql =
        "/* batch.getTasksByUuids */ SELECT * from tasks where uuid IN ( <uuids> )";

    public SelfIdBatcher() {
      super(sql, "uuids", new TaskMapper());
    }
  }

  @Override
  public List<Task> getByIds(List<String> uuids) {
    final IdBatcher<Task> idBatcher =
        AnetObjectEngine.getInstance().getInjector().getInstance(SelfIdBatcher.class);
    return idBatcher.getByIds(uuids);
  }

  static class ResponsiblePositionsBatcher extends ForeignKeyBatcher<Position> {
    private static final String sql =
        "/* batch.getResponsiblePositionsForTask */ SELECT \"taskUuid\", "
            + PositionDao.POSITIONS_FIELDS + " FROM positions, \"taskResponsiblePositions\" "
            + "WHERE \"taskResponsiblePositions\".\"taskUuid\" IN ( <foreignKeys> ) "
            + "AND \"taskResponsiblePositions\".\"positionUuid\" = positions.uuid";

    public ResponsiblePositionsBatcher() {
      super(sql, "foreignKeys", new PositionMapper(), "taskUuid");
    }
  }

  public List<List<Position>> getResponsiblePositions(List<String> foreignKeys) {
    final ForeignKeyBatcher<Position> responsiblePositionsBatcher =
        AnetObjectEngine.getInstance().getInjector().getInstance(ResponsiblePositionsBatcher.class);
    return responsiblePositionsBatcher.getByForeignKeys(foreignKeys);
  }

  @Override
  public Task insertInternal(Task p) {
    getDbHandle().createUpdate("/* insertTask */ INSERT INTO tasks "
        + "(uuid, \"longName\", \"shortName\", category, \"customFieldRef1Uuid\", \"organizationUuid\", \"createdAt\", \"updatedAt\", status, "
        + "\"customField\", \"customFieldEnum1\", \"customFieldEnum2\", \"plannedCompletion\", \"projectedCompletion\") "
        + "VALUES (:uuid, :longName, :shortName, :category, :customFieldRef1Uuid, :responsibleOrgUuid, :createdAt, :updatedAt, :status, "
        + ":customField, :customFieldEnum1, :customFieldEnum2, :plannedCompletion, :projectedCompletion)")
        .bindBean(p).bind("createdAt", DaoUtils.asLocalDateTime(p.getCreatedAt()))
        .bind("updatedAt", DaoUtils.asLocalDateTime(p.getUpdatedAt()))
        .bind("plannedCompletion", DaoUtils.asLocalDateTime(p.getPlannedCompletion()))
        .bind("projectedCompletion", DaoUtils.asLocalDateTime(p.getProjectedCompletion()))
        .bind("status", DaoUtils.getEnumId(p.getStatus())).execute();
    final TaskBatch tb = getDbHandle().attach(TaskBatch.class);
    if (p.getResponsiblePositions() != null) {
      tb.inserttaskResponsiblePositions(p.getUuid(), p.getResponsiblePositions());
    }
    return p;
  }

  public interface TaskBatch {
    @SqlBatch("INSERT INTO \"taskResponsiblePositions\" (\"taskUuid\", \"positionUuid\") VALUES (:taskUuid, :uuid)")
    void inserttaskResponsiblePositions(@Bind("taskUuid") String taskUuid,
        @BindBean List<Position> responsiblePositions);
  }

  @Override
  public int updateInternal(Task p) {
    return getDbHandle().createUpdate(
        "/* updateTask */ UPDATE tasks set \"longName\" = :longName, \"shortName\" = :shortName, "
            + "category = :category, \"customFieldRef1Uuid\" = :customFieldRef1Uuid, \"updatedAt\" = :updatedAt, "
            + "\"organizationUuid\" = :responsibleOrgUuid, status = :status, "
            + "\"customField\" = :customField, \"customFieldEnum1\" = :customFieldEnum1, \"customFieldEnum2\" = :customFieldEnum2, "
            + "\"plannedCompletion\" = :plannedCompletion, \"projectedCompletion\" = :projectedCompletion "
            + "WHERE uuid = :uuid")
        .bindBean(p).bind("updatedAt", DaoUtils.asLocalDateTime(p.getUpdatedAt()))
        .bind("plannedCompletion", DaoUtils.asLocalDateTime(p.getPlannedCompletion()))
        .bind("projectedCompletion", DaoUtils.asLocalDateTime(p.getProjectedCompletion()))
        .bind("status", DaoUtils.getEnumId(p.getStatus())).execute();
  }

  @Override
  public int deleteInternal(String uuid) {
    throw new UnsupportedOperationException();
  }

  public int addPositionToTask(Position p, Task t) {
    return getDbHandle().createUpdate(
        "/* addPositionToTask */ INSERT INTO \"taskResponsiblePositions\" (\"taskUuid\", \"positionUuid\") "
            + "VALUES (:taskUuid, :positionUuid)")
        .bind("taskUuid", t.getUuid()).bind("positionUuid", p.getUuid()).execute();
  }

  public int removePositionFromTask(Position p, Task t) {
    return getDbHandle()
        .createUpdate("/* removePositionFromTask*/ DELETE FROM \"taskResponsiblePositions\" "
            + "WHERE \"taskUuid\" = :taskUuid AND \"positionUuid\" = :positionUuid")
        .bind("taskUuid", t.getUuid()).bind("positionUuid", p.getUuid()).execute();
  }

  public CompletableFuture<List<Position>> getResponsiblePositionsForTask(
      Map<String, Object> context, String taskUuid) {
    return new ForeignKeyFetcher<Position>().load(context, "task.responsiblePositions", taskUuid);
  }

  public int setResponsibleOrgForTask(String taskUuid, String organizationUuid) {
    return getDbHandle()
        .createUpdate("/* setReponsibleOrgForTask */ UPDATE tasks "
            + "SET \"organizationUuid\" = :orgUuid, \"updatedAt\" = :updatedAt WHERE uuid = :uuid")
        .bind("orgUuid", organizationUuid).bind("uuid", taskUuid)
        .bind("updatedAt", DaoUtils.asLocalDateTime(Instant.now())).execute();
  }

  public List<Task> getTopLevelTasks() {
    return getDbHandle()
        .createQuery("/* getTopTasks */ SELECT * FROM tasks WHERE \"customFieldRef1Uuid\" IS NULL")
        .map(new TaskMapper()).list();
  }

  public AnetBeanList<Task> search(TaskSearchQuery query) {
    return AnetObjectEngine.getInstance().getSearcher().getTaskSearcher().runSearch(query);
  }

  public List<Task> getRecentTasks(Person author, int maxResults) {
    String sql;
    if (DaoUtils.isMsSql()) {
      sql =
          "/* getRecentTasks */ SELECT tasks.* FROM tasks WHERE tasks.status = :status AND tasks.uuid IN ("
              + "SELECT TOP(:maxResults) \"reportTasks\".\"taskUuid\" "
              + "FROM reports JOIN \"reportTasks\" ON reports.uuid = \"reportTasks\".\"reportUuid\" "
              + "WHERE \"authorUuid\" = :authorUuid " + "GROUP BY \"taskUuid\" "
              + "ORDER BY MAX(reports.\"createdAt\") DESC" + ")";
    } else {
      sql =
          "/* getRecentTask */ SELECT tasks.* FROM tasks WHERE tasks.status = :status AND tasks.uuid IN ("
              + "SELECT \"reportTasks\".\"taskUuid\" "
              + "FROM reports JOIN \"reportTasks\" ON reports.uuid = \"reportTasks\".\"reportUuid\" "
              + "WHERE \"authorUuid\" = :authorUuid " + "GROUP BY \"taskUuid\" "
              + "ORDER BY MAX(reports.\"createdAt\") DESC " + "LIMIT :maxResults" + ")";
    }
    return getDbHandle().createQuery(sql).bind("authorUuid", author.getUuid())
        .bind("maxResults", maxResults).bind("status", DaoUtils.getEnumId(TaskStatus.ACTIVE))
        .map(new TaskMapper()).list();
  }

  public List<Task> getTasksByOrganizationUuid(String orgUuid) {
    return getDbHandle()
        .createQuery(
            "/* getTasksByOrg */ SELECT * from tasks WHERE \"organizationUuid\" = :orgUuid")
        .bind("orgUuid", orgUuid).map(new TaskMapper()).list();
  }

  static class ReportsBatcher extends ForeignKeyBatcher<Report> {
    private static final String sql = "/* batch.getReportsForTasks */ SELECT "
        + ReportDao.REPORT_FIELDS + ", reportUuid, taskUuid FROM reports, \"reportTasks\" "
        + "WHERE \"reportTasks\".\"taskUuid\" IN ( <foreignKeys> ) "
        + "AND \"reportTasks\".\"reportUuid\" = reports.uuid";

    public ReportsBatcher() {
      super(sql, "foreignKeys", new ReportMapper(), "taskUuid");
    }
  }

  public List<List<Report>> getReports(List<String> foreignKeys) {
    final ForeignKeyBatcher<Report> tasksBatcher =
        AnetObjectEngine.getInstance().getInjector().getInstance(ReportsBatcher.class);
    return tasksBatcher.getByForeignKeys(foreignKeys);
  }

  public CompletableFuture<List<Report>> getReportsForTask(
      @GraphQLRootContext Map<String, Object> context, String taskUuid) {
    return new ForeignKeyFetcher<Report>().load(context, "task.reports", taskUuid);
  }


}
