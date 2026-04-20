// Template: Controller + Service + Repository skeleton
@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    public ApiResponse<List<ResourceResponse>> findAll() {
        return ApiResponse.success(resourceService.findAll());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ResourceResponse>> create(@Valid @RequestBody ResourceCreateRequest request) {
        ResourceResponse created = resourceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }
}

@Service
@RequiredArgsConstructor
class ResourceService {

    private final ResourceRepository resourceRepository;

    public List<ResourceResponse> findAll() {
        return resourceRepository.findAll().stream().map(this::toResponse).toList();
    }

    public ResourceResponse create(ResourceCreateRequest request) {
        ResourceEntity entity = new ResourceEntity();
        entity.setName(request.getName());
        return toResponse(resourceRepository.save(entity));
    }

    private ResourceResponse toResponse(ResourceEntity entity) {
        return new ResourceResponse(entity.getId(), entity.getName());
    }
}

@Repository
interface ResourceRepository extends JpaRepository<ResourceEntity, Long> {
}
